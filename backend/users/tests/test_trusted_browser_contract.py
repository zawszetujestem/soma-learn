"""Acceptance contract: optional 24h "remember this browser" after a correct login OTP."""
import time
from datetime import timedelta
from unittest import mock
from urllib.parse import parse_qs, urlencode, urlparse

import copy

from django.apps import apps
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sessions.models import Session
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from users.models import Role
from users.tests.test_auth_contract import HEADLESS, PASSWORD, HeadlessBrowserMixin, create_user
from users.tests.test_password_reset_contract import RESET_CODE_RE

COOKIE = 'soma_trusted_browser'
NEW_PASSWORD = 'Brand-New-Password-917!'
TRUST_SECONDS = 24 * 60 * 60
GOOGLE_VIEWS = 'allauth.socialaccount.providers.google.views.GoogleOAuth2Adapter'


def trusted_browser_model():
    return apps.get_model('users', 'TrustedBrowser')


class TrustedBrowserMixin(HeadlessBrowserMixin):
    def setUp(self):
        cache.clear()
        mail.outbox = []
        self.user = create_user()

    def confirm(self, client, code, with_csrf=True, **extra):
        headers = self.csrf(client) if with_csrf else {}
        return client.post(
            f'{HEADLESS}/auth/code/confirm', {'code': code, **extra}, format='json', **headers,
        )

    def pending_code(self, client, user=None):
        user = user or self.user
        cache.clear()  # existing login_code_resend 1/60s/key would block a 2nd code for the same e-mail
        sent_before = len(self.login_codes(user.email))
        response = self.start_login(client, user.email)
        self.assertEqual(response.status_code, 401, response.content)
        codes = self.login_codes(user.email)
        self.assertEqual(len(codes), sent_before + 1)
        return codes[-1]

    def login_with_code(self, client, user=None, **extra):
        response = self.confirm(client, self.pending_code(client, user), **extra)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['meta']['is_authenticated'])
        return response

    def remembered_client(self, user=None):
        client = self.browser_client()
        self.login_with_code(client, user, remember_browser=True)
        self.assertTrue(client.cookies[COOKIE].value)
        return client

    def drop_session(self, client):
        """Same browser profile, but the Django session is gone (expired/cleared)."""
        if settings.SESSION_COOKIE_NAME in client.cookies:
            del client.cookies[settings.SESSION_COOKIE_NAME]
        self.assertFalse(self.session(client)['meta']['is_authenticated'])

    def logout(self, client, with_csrf=True):
        headers = self.csrf(client) if with_csrf else {}
        return client.delete(f'{HEADLESS}/auth/session', **headers)

    def assert_no_trust_issued(self, response, user=None):
        self.assertNotIn(COOKIE, response.cookies)
        self.assertFalse(trusted_browser_model().objects.filter(user=user or self.user).exists())

    def assert_trusted_login(self, client, user=None, password=PASSWORD):
        user = user or self.user
        sent_before = len(mail.outbox)
        response = self.start_login(client, user.email, password=password)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['meta']['is_authenticated'])
        self.assertEqual(len(mail.outbox), sent_before, 'Trusted browser must skip the login code e-mail.')
        self.assertNotIn(COOKIE, response.cookies, 'Trusted use must not reissue the cookie.')
        return response

    def assert_code_required(self, client, user=None):
        user = user or self.user
        cache.clear()  # see pending_code
        sent_before = len(self.login_codes(user.email))
        response = self.start_login(client, user.email)
        self.assertEqual(response.status_code, 401, response.content)
        self.assertIn('login_by_code', self.pending_flow_ids(response.json()))
        self.assertEqual(len(self.login_codes(user.email)), sent_before + 1)
        self.assertFalse(self.session(client)['meta']['is_authenticated'])
        return response


class RememberBrowserIssueContractTests(TrustedBrowserMixin, TestCase):
    def test_default_confirm_does_not_trust_browser(self):
        client = self.browser_client()

        response = self.login_with_code(client)

        self.assert_no_trust_issued(response)
        self.drop_session(client)
        self.assert_code_required(client)

    def test_remember_false_does_not_trust_browser(self):
        client = self.browser_client()

        response = self.login_with_code(client, remember_browser=False)

        self.assert_no_trust_issued(response)
        self.drop_session(client)
        self.assert_code_required(client)

    def test_non_boolean_remember_values_are_treated_as_false(self):
        for value in ('true', 'True', 1, 'yes', None, [True], {'value': True}):
            with self.subTest(value=value):
                cache.clear()
                client = self.browser_client()

                response = self.login_with_code(client, remember_browser=value)

                self.assert_no_trust_issued(response)

    def test_wrong_code_with_remember_issues_nothing(self):
        client = self.browser_client()
        code = self.pending_code(client)

        response = self.confirm(client, self.wrong_code(code), remember_browser=True)

        self.assertEqual(response.status_code, 400)
        self.assert_no_trust_issued(response)

    def test_expired_code_with_remember_issues_nothing(self):
        client = self.browser_client()
        code = self.pending_code(client)
        clock = mock.Mock(time=mock.Mock(return_value=time.time() + 10 * 60 + 5))

        with mock.patch('allauth.account.internal.flows.code_verification.time', new=clock):
            response = self.confirm(client, code, remember_browser=True)

        self.assertNotEqual(response.status_code, 200)
        self.assert_no_trust_issued(response)
        self.assertFalse(self.session(client)['meta']['is_authenticated'])

    def test_exhausted_code_with_remember_issues_nothing(self):
        client = self.browser_client()
        code = self.pending_code(client)
        for _ in range(5):
            self.confirm(client, self.wrong_code(code), remember_browser=True)

        response = self.confirm(client, code, remember_browser=True)

        self.assertNotEqual(response.status_code, 200)
        self.assert_no_trust_issued(response)

    def test_confirm_without_csrf_issues_nothing(self):
        client = self.browser_client()
        code = self.pending_code(client)

        response = self.confirm(client, code, with_csrf=False, remember_browser=True)

        self.assertEqual(response.status_code, 403)
        self.assert_no_trust_issued(response)
        self.assertFalse(self.session(client)['meta']['is_authenticated'])

    def test_confirm_without_pending_login_issues_nothing(self):
        client = self.browser_client()

        response = self.confirm(client, '123456', remember_browser=True)

        self.assertEqual(response.status_code, 409)
        self.assert_no_trust_issued(response)

    def test_cookie_flags_and_only_hash_persisted(self):
        client = self.browser_client()

        response = self.login_with_code(client, remember_browser=True)

        morsel = response.cookies[COOKIE]
        raw = morsel.value
        self.assertGreaterEqual(len(raw), 32)
        self.assertTrue(morsel['httponly'])
        self.assertEqual(morsel['samesite'], 'Lax')
        self.assertEqual(morsel['domain'], '')
        self.assertEqual(morsel['path'], '/')
        self.assertEqual(int(morsel['max-age']), TRUST_SECONDS)
        self.assertEqual(bool(morsel['secure']), settings.SESSION_COOKIE_SECURE)
        self.assertNotIn(raw, response.content.decode())

        row = trusted_browser_model().objects.get(user=self.user)
        self.assertEqual(row.expires_at - row.created_at, timedelta(seconds=TRUST_SECONDS))
        for field in row._meta.concrete_fields:
            value = getattr(row, field.attname)
            if isinstance(value, str):
                self.assertNotIn(raw, value)
                self.assertNotIn(self.user.password, value)

    @override_settings(SESSION_COOKIE_SECURE=True)
    def test_cookie_is_secure_when_session_cookie_is_secure(self):
        client = self.browser_client()

        response = self.login_with_code(client, remember_browser=True)

        self.assertTrue(response.cookies[COOKIE]['secure'])

    def test_session_settings_unchanged(self):
        self.assertEqual(settings.SESSION_COOKIE_AGE, 14 * 24 * 60 * 60)
        self.assertFalse(getattr(settings, 'SESSION_EXPIRE_AT_BROWSER_CLOSE', False))


class TrustedBrowserLoginContractTests(TrustedBrowserMixin, TestCase):
    def test_trusted_browser_requires_password_skips_code_and_allows_token_exchange(self):
        client = self.remembered_client()
        self.drop_session(client)

        self.assert_trusted_login(client)

        self.assertTrue(self.session(client)['meta']['is_authenticated'])
        exchange = self.exchange_token(client)
        self.assertEqual(exchange.status_code, 200)
        self.assertEqual(exchange.data['user']['email'], self.user.email)

    def test_trusted_cookie_alone_does_not_authenticate(self):
        client = self.remembered_client()
        self.drop_session(client)

        self.assertFalse(self.session(client)['meta']['is_authenticated'])
        self.assertIn(self.exchange_token(client).status_code, (401, 403))

    def test_wrong_or_missing_password_is_rejected_on_trusted_browser(self):
        client = self.remembered_client()
        self.drop_session(client)

        wrong = self.start_login(client, self.user.email, password='Wrong-Password-000!')
        missing = client.post(
            f'{HEADLESS}/auth/login', {'email': self.user.email}, format='json', **self.csrf(client),
        )

        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(missing.status_code, 400)
        self.assertFalse(self.session(client)['meta']['is_authenticated'])

    def test_inactive_or_unconfirmed_user_cannot_use_trust(self):
        for field in ('is_active', 'is_email_confirmed'):
            with self.subTest(field=field):
                cache.clear()
                user = create_user(email=f'{field}@example.com')
                client = self.remembered_client(user)
                self.drop_session(client)
                setattr(user, field, False)
                user.save(update_fields=[field])

                response = self.start_login(client, user.email)

                self.assertNotEqual(response.status_code, 200)
                self.assertFalse(self.session(client)['meta']['is_authenticated'])

    def test_already_authenticated_login_still_conflicts(self):
        client = self.remembered_client()

        self.assertEqual(self.start_login(client, self.user.email).status_code, 409)

    def test_trust_valid_until_exactly_24h_and_use_does_not_refresh(self):
        client = self.remembered_client()
        row = trusted_browser_model().objects.get(user=self.user)
        expires_at, token_hash = row.expires_at, row.token_hash
        self.drop_session(client)

        with mock.patch('django.utils.timezone.now', return_value=expires_at - timedelta(seconds=1)):
            self.assert_trusted_login(client)
        row.refresh_from_db()
        self.assertEqual(row.expires_at, expires_at)
        self.assertEqual(row.token_hash, token_hash)
        self.assertEqual(trusted_browser_model().objects.filter(user=self.user).count(), 1)

        self.drop_session(client)
        with mock.patch('django.utils.timezone.now', return_value=expires_at):
            self.assert_code_required(client)

    def test_trust_is_bound_to_user(self):
        other = create_user(email='other@example.com')
        client = self.remembered_client()
        self.drop_session(client)

        self.assert_code_required(client, other)
        self.assertTrue(trusted_browser_model().objects.filter(user=self.user).exists())

    def test_tampered_or_oversized_cookie_is_not_trusted(self):
        client = self.remembered_client()
        raw = client.cookies[COOKIE].value
        tampered = raw[:-1] + ('A' if raw[-1] != 'A' else 'B')
        for value in (tampered, raw + 'x', 'x' * 5000, ''):
            with self.subTest(length=len(value)):
                cache.clear()
                other_profile = self.browser_client()
                other_profile.cookies[COOKIE] = value

                self.assert_code_required(other_profile)

    def test_cookie_copied_to_another_profile_is_bearer_until_revoked(self):
        client = self.remembered_client()
        raw = client.cookies[COOKIE].value
        copy_profile = self.browser_client()
        copy_profile.cookies[COOKIE] = raw

        self.assert_trusted_login(copy_profile)

    def test_all_roles_including_staff_and_superuser_can_be_trusted(self):
        variants = [
            ('student', [Role.STUDENT], {}),
            ('mentor', [Role.MENTOR], {}),
            ('owner', [Role.OWNER], {}),
            ('admin', [Role.ADMIN], {}),
            ('staff', [Role.ADMIN], {'is_staff': True}),
            ('superuser', [Role.ADMIN], {'is_staff': True, 'is_superuser': True}),
        ]
        for label, roles, flags in variants:
            with self.subTest(role=label):
                cache.clear()
                user = create_user(email=f'{label}.role@example.com')
                user.roles.set([Role.objects.get_or_create(name=name)[0] for name in roles])
                for key, value in flags.items():
                    setattr(user, key, value)
                user.save()
                client = self.remembered_client(user)
                self.drop_session(client)

                self.assert_trusted_login(client, user)


class TrustedBrowserLogoutContractTests(TrustedBrowserMixin, TestCase):
    def assert_cookie_deleted(self, response):
        self.assertIn(COOKIE, response.cookies)
        self.assertEqual(response.cookies[COOKIE].value, '')
        self.assertEqual(int(response.cookies[COOKIE]['max-age']), 0)

    def test_logout_revokes_only_this_profile_and_replay_fails(self):
        profile_a = self.remembered_client()
        profile_b = self.remembered_client()
        raw_a = profile_a.cookies[COOKIE].value
        self.assertEqual(trusted_browser_model().objects.filter(user=self.user).count(), 2)

        response = self.logout(profile_a)

        self.assert_cookie_deleted(response)
        self.assertFalse(self.session(profile_a)['meta']['is_authenticated'])
        self.assertEqual(trusted_browser_model().objects.filter(user=self.user).count(), 1)
        replay = self.browser_client()
        replay.cookies[COOKIE] = raw_a
        self.assert_code_required(replay)
        self.drop_session(profile_b)
        self.assert_trusted_login(profile_b)

    def test_logout_with_expired_session_still_revokes_and_deletes_cookie(self):
        client = self.remembered_client()
        raw = client.cookies[COOKIE].value
        Session.objects.all().delete()

        response = self.logout(client)

        self.assert_cookie_deleted(response)
        self.assertFalse(trusted_browser_model().objects.filter(user=self.user).exists())
        replay = self.browser_client()
        replay.cookies[COOKIE] = raw
        self.assert_code_required(replay)

    def test_logout_without_trust_cookie_still_works(self):
        client = self.browser_client()
        self.login_with_code(client)

        response = self.logout(client)

        self.assertEqual(response.status_code, 401)
        self.assertFalse(self.session(client)['meta']['is_authenticated'])

    def test_legacy_accounts_logout_is_not_available(self):
        client = APIClient()
        for method in ('get', 'post'):
            with self.subTest(method=method):
                self.assertEqual(getattr(client, method)('/accounts/logout/').status_code, 404)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class TrustedBrowserPasswordResetContractTests(TrustedBrowserMixin, TestCase):
    def two_trusted_profiles(self):
        profiles = [self.remembered_client(), self.remembered_client()]
        for profile in profiles:
            self.drop_session(profile)
        return profiles

    def assert_profiles_need_code(self, profiles, password):
        for profile in profiles:
            cache.clear()
            sent_before = len(self.login_codes(self.user.email))
            response = self.start_login(profile, self.user.email, password=password)
            self.assertEqual(response.status_code, 401, response.content)
            self.assertEqual(len(self.login_codes(self.user.email)), sent_before + 1)

    def test_headless_password_reset_revokes_all_profiles(self):
        profiles = self.two_trusted_profiles()
        reset_client = self.browser_client()
        mail.outbox = []
        reset_client.post(
            f'{HEADLESS}/auth/password/request', {'email': self.user.email}, format='json',
            **self.csrf(reset_client),
        )
        code = RESET_CODE_RE.search(mail.outbox[-1].body).group(1)

        response = reset_client.post(
            f'{HEADLESS}/auth/password/reset', {'key': code, 'password': NEW_PASSWORD}, format='json',
            **self.csrf(reset_client),
        )

        self.assertIn(response.status_code, (200, 401))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assert_profiles_need_code(profiles, NEW_PASSWORD)

    def test_legacy_password_reset_revokes_all_profiles(self):
        profiles = self.two_trusted_profiles()
        self.user.refresh_from_db()  # last_login changed; reset token depends on it

        response = APIClient().post('/api/auth/password-reset-confirm/', {
            'uid': urlsafe_base64_encode(force_bytes(self.user.pk)),
            'token': default_token_generator.make_token(self.user),
            'new_password': NEW_PASSWORD,
        }, format='json')

        self.assertEqual(response.status_code, 200, response.content)
        self.assert_profiles_need_code(profiles, NEW_PASSWORD)


class TrustedBrowserGoogleRegressionTests(TrustedBrowserMixin, TestCase):
    def setUp(self):
        super().setUp()
        providers = copy.deepcopy(settings.SOCIALACCOUNT_PROVIDERS)
        providers['google']['APP'] = {'client_id': 'test-id', 'secret': 'test-secret', 'key': ''}
        self.enterContext(self.settings(SOCIALACCOUNT_PROVIDERS=providers))

    def google_login(self, client):
        redirect = client.post(
            f'{HEADLESS}/auth/provider/redirect',
            urlencode({
                'provider': 'google', 'process': 'login', 'callback_url': '/auth/google/callback',
                'csrfmiddlewaretoken': client.cookies['csrftoken'].value,
            }),
            content_type='application/x-www-form-urlencoded',
        )
        self.assertEqual(redirect.status_code, 302)
        state = parse_qs(urlparse(redirect['Location']).query)['state'][0]
        profile = {
            'id': 'google-uid-1', 'email': self.user.email, 'verified_email': True,
            'given_name': 'Google', 'family_name': 'User',
        }
        token_data = {'access_token': 'fake', 'token_type': 'Bearer', 'expires_in': 3600}
        with (
            mock.patch(f'{GOOGLE_VIEWS}.get_access_token_data', return_value=token_data),
            mock.patch(f'{GOOGLE_VIEWS}._fetch_user_info', return_value=profile),
        ):
            return client.get('/accounts/google/login/callback/', {'code': 'fake', 'state': state})

    def test_google_login_unchanged_and_does_not_issue_trust(self):
        client = self.browser_client()

        response = self.google_login(client)

        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.session(client)['meta']['is_authenticated'])
        self.assert_no_trust_issued(response)
        self.assertEqual(mail.outbox, [])

    def test_google_login_leaves_existing_trust_untouched(self):
        client = self.remembered_client()
        raw = client.cookies[COOKIE].value
        self.drop_session(client)

        response = self.google_login(client)

        self.assertTrue(self.session(client)['meta']['is_authenticated'])
        self.assertNotIn(COOKIE, response.cookies)
        self.assertEqual(client.cookies[COOKIE].value, raw)
        self.assertEqual(trusted_browser_model().objects.filter(user=self.user).count(), 1)