import copy
from unittest import mock
from urllib.parse import parse_qs, urlencode, urlparse

from django.apps import apps
from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from users.models import Role, User

HEADLESS = '/_allauth/browser/v1'
PASSWORD = 'Long-Unique-Password-482!'
CALLBACK_PATH = '/auth/google/callback'
GOOGLE_VIEWS = 'allauth.socialaccount.providers.google.views.GoogleOAuth2Adapter'
UNAUTHENTICATED_STATUSES = (401, 403)


class GoogleSettingsContractTests(TestCase):
    def test_only_google_provider_with_email_authentication_and_auto_connect(self):
        providers = getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {})

        self.assertEqual(set(providers), {'google'})
        self.assertTrue(
            providers['google'].get('EMAIL_AUTHENTICATION')
            or getattr(settings, 'SOCIALACCOUNT_EMAIL_AUTHENTICATION', False)
        )
        self.assertTrue(getattr(settings, 'SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT', False))


class HeadlessGoogleLoginContractTests(TestCase):
    def setUp(self):
        cache.clear()
        providers = copy.deepcopy(getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {}))
        providers.setdefault('google', {})['APP'] = {
            'client_id': 'test-google-client-id',
            'secret': 'test-google-client-secret',
            'key': '',
        }
        self.enterContext(self.settings(SOCIALACCOUNT_PROVIDERS=providers))

        self.client = APIClient(enforce_csrf_checks=True)
        self.client.get(f'{HEADLESS}/auth/session')
        self.assertIn('csrftoken', self.client.cookies, 'Headless session GET must set the CSRF cookie.')

    def create_user(self, email='google.user@example.com', confirmed=True, active=True):
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            first_name='Google',
            last_name='User',
            is_email_confirmed=confirmed,
            is_active=active,
        )
        student_role, _ = Role.objects.get_or_create(name=Role.STUDENT)
        user.roles.add(student_role)
        apps.get_model('account', 'EmailAddress').objects.create(
            user=user, email=user.email, primary=True, verified=confirmed,
        )
        return user

    def csrf_token(self):
        return self.client.cookies['csrftoken'].value

    def redirect_to_google(self, callback_url=CALLBACK_PATH, with_csrf=True):
        data = {'provider': 'google', 'process': 'login', 'callback_url': callback_url}
        if with_csrf:
            data['csrfmiddlewaretoken'] = self.csrf_token()
        return self.client.post(
            f'{HEADLESS}/auth/provider/redirect',
            urlencode(data),
            content_type='application/x-www-form-urlencoded',
        )

    def google_callback(self, email, email_verified=True, uid='google-uid-1'):
        redirect = self.redirect_to_google()
        self.assertEqual(redirect.status_code, 302)
        state = parse_qs(urlparse(redirect['Location']).query)['state'][0]
        profile = {
            'id': uid,
            'email': email,
            'verified_email': email_verified,
            'given_name': 'Google',
            'family_name': 'User',
        }
        token_data = {'access_token': 'fake-access-token', 'token_type': 'Bearer', 'expires_in': 3600}
        with (
            mock.patch(f'{GOOGLE_VIEWS}.get_access_token_data', return_value=token_data),
            mock.patch(f'{GOOGLE_VIEWS}._fetch_user_info', return_value=profile),
        ):
            return self.client.get('/accounts/google/login/callback/', {'code': 'fake-code', 'state': state})

    def session(self):
        response = self.client.get(f'{HEADLESS}/auth/session')
        self.assertIn(response.status_code, (200, 401))
        return response.json()

    def social_accounts(self):
        return apps.get_model('socialaccount', 'SocialAccount').objects.filter(provider='google')

    def assert_not_logged_in(self, response):
        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(self.session()['meta']['is_authenticated'])
        self.assertFalse(self.social_accounts().exists())

    def test_provider_redirect_requires_csrf_token(self):
        response = self.redirect_to_google(with_csrf=False)

        self.assertEqual(response.status_code, 403)

    def test_provider_redirect_form_post_sends_browser_to_google(self):
        response = self.redirect_to_google()

        self.assertEqual(response.status_code, 302)
        location = urlparse(response['Location'])
        query = parse_qs(location.query)
        self.assertEqual(location.netloc, 'accounts.google.com')
        self.assertEqual(query['client_id'], ['test-google-client-id'])
        self.assertTrue(query['redirect_uri'][0].endswith('/accounts/google/login/callback/'))
        self.assertIn('state', query)
        self.assertNotIn('token', query)

    def test_provider_redirect_rejects_untrusted_callback_url(self):
        response = self.redirect_to_google(callback_url='https://evil.example.com/steal')

        self.assertFalse(
            response.status_code == 302 and urlparse(response['Location']).netloc == 'accounts.google.com'
        )

    def test_existing_active_confirmed_account_logs_in_and_connects_google(self):
        user = self.create_user()
        token, _ = Token.objects.get_or_create(user=user)
        users_before = User.objects.count()

        response = self.google_callback(user.email)

        self.assertEqual(response.status_code, 302)
        location = urlparse(response['Location'])
        self.assertEqual(location.path, CALLBACK_PATH)
        self.assertNotIn('error', parse_qs(location.query))
        self.assertTrue(self.session()['meta']['is_authenticated'])
        self.assertEqual(User.objects.count(), users_before)
        social_account = self.social_accounts().get()
        self.assertEqual(social_account.user, user)
        self.assertEqual(social_account.uid, 'google-uid-1')
        # LOGIN_BY_CODE_REQUIRED covers password logins only.
        self.assertEqual(mail.outbox, [])

        exchange = self.client.post(
            '/api/auth/token/exchange/', {}, format='json', HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(exchange.status_code, 200)
        self.assertEqual(exchange.data['token'], token.key)
        self.assertEqual(exchange.data['user']['email'], user.email)

    def test_unknown_google_email_does_not_create_user(self):
        response = self.google_callback('new-google-user@example.com')

        self.assert_not_logged_in(response)
        self.assertFalse(User.objects.filter(email='new-google-user@example.com').exists())

    def test_case_insensitive_verified_email_logs_in_connects_and_preserves_local_password(self):
        user = self.create_user(email='Case.User@Example.com')
        address = apps.get_model('account', 'EmailAddress').objects.get(user=user)
        self.assertEqual(address.email, 'case.user@example.com')
        old_password = user.password
        users_before = User.objects.count()
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_confirmed)
        self.assertTrue(address.verified)
        self.assertTrue(user.has_usable_password())

        response = self.google_callback('CASE.USER@example.com')

        user.refresh_from_db()
        with self.subTest(check='local_password_preserved'):
            self.assertTrue(user.has_usable_password())
            self.assertEqual(user.password, old_password)
            self.assertTrue(user.check_password(PASSWORD))
        with self.subTest(check='google_authentication'):
            self.assertEqual(response.status_code, 302)
            location = urlparse(response['Location'])
            self.assertEqual(location.path, CALLBACK_PATH)
            self.assertNotIn('error', parse_qs(location.query))
            self.assertTrue(self.session()['meta']['is_authenticated'])
            self.assertEqual(str(self.client.session['_auth_user_id']), str(user.pk))
        with self.subTest(check='google_connected_without_duplicate_user'):
            self.assertEqual(User.objects.count(), users_before)
            social_account = self.social_accounts().get()
            self.assertEqual(social_account.user_id, user.pk)
            self.assertEqual(social_account.uid, 'google-uid-1')

    def test_unconfirmed_local_account_is_not_linked_or_modified(self):
        user = self.create_user(confirmed=False)

        response = self.google_callback(user.email)

        self.assert_not_logged_in(response)
        user.refresh_from_db()
        self.assertTrue(user.has_usable_password())
        self.assertFalse(user.is_email_confirmed)

    def test_inactive_account_is_not_logged_in(self):
        user = self.create_user(active=False)

        response = self.google_callback(user.email)

        self.assert_not_logged_in(response)

    def test_unverified_google_email_is_not_linked(self):
        user = self.create_user()

        response = self.google_callback(user.email, email_verified=False)

        self.assert_not_logged_in(response)
        self.assertEqual(User.objects.filter(email=user.email).count(), 1)

    def test_local_email_address_must_be_verified_to_link_google(self):
        user = self.create_user()
        apps.get_model('account', 'EmailAddress').objects.filter(user=user).update(verified=False)

        response = self.google_callback(user.email)

        self.assert_not_logged_in(response)
        user.refresh_from_db()
        self.assertTrue(user.has_usable_password())

    def test_callback_with_unknown_state_does_not_authenticate(self):
        self.create_user()

        response = self.client.get(
            '/accounts/google/login/callback/',
            {'code': 'untrusted-code', 'state': 'invalid-state'},
        )

        self.assert_not_logged_in(response)

    def test_case_insensitive_duplicate_local_emails_are_rejected(self):
        self.create_user(email='duplicate@example.com')
        legacy = User.objects.create_user(
            email='duplicate.legacy@example.com', password=PASSWORD,
            first_name='Duplicate', last_name='User', is_email_confirmed=True,
        )
        User.objects.filter(pk=legacy.pk).update(email='DUPLICATE@example.com')

        response = self.google_callback('duplicate@example.com')

        self.assert_not_logged_in(response)

    def test_linked_google_account_requires_verified_email_matching_local_user(self):
        user = self.create_user()
        apps.get_model('socialaccount', 'SocialAccount').objects.create(
            user=user, provider='google', uid='google-uid-1',
        )

        self.google_callback('different@example.com')

        self.assertFalse(self.session()['meta']['is_authenticated'])
        self.assertEqual(self.social_accounts().get().user_id, user.pk)

    def test_token_exchange_requires_authenticated_session(self):
        response = self.client.post(
            '/api/auth/token/exchange/', {}, format='json', HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertIn(response.status_code, UNAUTHENTICATED_STATUSES)
        self.assertNotIn('token', getattr(response, 'data', None) or {})


class LegacySocialLoginContractTests(TestCase):
    def test_client_supplied_social_profile_endpoint_is_gone(self):
        response = APIClient().post(
            '/api/auth/social-login/',
            {
                'provider': 'google',
                'email': 'new-google-user@example.com',
                'first_name': 'New',
                'last_name': 'User',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 410)
        self.assertFalse(User.objects.filter(email='new-google-user@example.com').exists())
        self.assertEqual(Token.objects.count(), 0)