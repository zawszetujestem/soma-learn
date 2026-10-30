import re
import time
from unittest import mock

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from users.models import Role

HEADLESS = '/_allauth/browser/v1'
PASSWORD = 'Long-Unique-Password-482!'
# Accepts "123456" and allauth's dashed rendering "123-456".
LOGIN_CODE_RE = re.compile(r'(?<![\w-])(\d{3})-?(\d{3})(?![\w-])')
UNAUTHENTICATED_STATUSES = (401, 403)


def create_user(email='confirmed@example.com', confirmed=True, active=True):
    user = get_user_model().objects.create_user(
        email=email,
        password=PASSWORD,
        first_name='Confirmed',
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


class HeadlessBrowserMixin:
    def browser_client(self):
        client = APIClient(enforce_csrf_checks=True)
        client.get(f'{HEADLESS}/auth/session')
        self.assertIn('csrftoken', client.cookies, 'Headless session GET must set the CSRF cookie.')
        return client

    def csrf(self, client):
        # Django rotates the token on login, so always read the current cookie.
        return {'HTTP_X_CSRFTOKEN': client.cookies['csrftoken'].value}

    def session(self, client):
        response = client.get(f'{HEADLESS}/auth/session')
        self.assertIn(response.status_code, (200, 401))
        return response.json()

    def pending_flow_ids(self, body):
        return {flow['id'] for flow in body.get('data', {}).get('flows', []) if flow.get('is_pending')}

    def start_login(self, client, email, password=PASSWORD):
        return client.post(
            f'{HEADLESS}/auth/login',
            {'email': email, 'password': password},
            format='json',
            **self.csrf(client),
        )

    def confirm_code(self, client, code):
        return client.post(
            f'{HEADLESS}/auth/code/confirm',
            {'code': code},
            format='json',
            **self.csrf(client),
        )

    def resend_code(self, client, with_csrf=True):
        headers = self.csrf(client) if with_csrf else {}
        return client.post('/api/auth/login/resend/', **headers)

    def exchange_token(self, client, with_csrf=True):
        headers = self.csrf(client) if with_csrf else {}
        return client.post('/api/auth/token/exchange/', {}, format='json', **headers)

    def login_codes(self, email):
        codes = []
        for message in mail.outbox:
            if email not in message.to:
                continue
            match = LOGIN_CODE_RE.search(message.body)
            if match:
                codes.append(''.join(match.groups()))
        return codes

    def wrong_code(self, code):
        return '000000' if code != '000000' else '111111'


class AllauthLoginSettingsContractTests(TestCase):
    def test_allauth_headless_apps_are_installed(self):
        for app in (
            'allauth',
            'allauth.account',
            'allauth.socialaccount',
            'allauth.socialaccount.providers.google',
            'allauth.headless',
        ):
            self.assertIn(app, settings.INSTALLED_APPS)
        self.assertIn('allauth.account.middleware.AccountMiddleware', settings.MIDDLEWARE)

    def test_login_code_required_only_for_password_and_passwordless_disabled(self):
        from allauth.account import app_settings as account_settings

        self.assertEqual(account_settings.LOGIN_BY_CODE_REQUIRED, {'password'})
        self.assertFalse(account_settings.LOGIN_BY_CODE_ENABLED)
        self.assertEqual(account_settings.LOGIN_BY_CODE_MAX_ATTEMPTS, 5)
        self.assertEqual(account_settings.LOGIN_BY_CODE_TIMEOUT, 10 * 60)
        self.assertGreaterEqual(account_settings.LOGIN_BY_CODE_MAX_RESEND_COUNT, 1)

    def test_explicit_login_code_format_and_shared_cache(self):
        self.assertEqual(
            settings.ACCOUNT_LOGIN_BY_CODE_FORMAT,
            {'numeric': True, 'length': 6, 'dashed': False},
        )
        self.assertEqual(settings.CACHES['default']['BACKEND'], 'django.core.cache.backends.db.DatabaseCache')


class HeadlessPasswordLoginByCodeContractTests(HeadlessBrowserMixin, TestCase):
    def setUp(self):
        cache.clear()
        self.user = create_user()
        self.client = self.browser_client()

    def start_pending_login(self):
        response = self.start_login(self.client, self.user.email)
        self.assertEqual(response.status_code, 401)
        codes = self.login_codes(self.user.email)
        self.assertEqual(len(codes), 1)
        return codes[0]

    def complete_login(self):
        code = self.start_pending_login()
        response = self.confirm_code(self.client, code)
        self.assertEqual(response.status_code, 200)
        return response

    def test_login_requires_csrf_token(self):
        response = self.client.post(
            f'{HEADLESS}/auth/login',
            {'email': self.user.email, 'password': PASSWORD},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(mail.outbox, [])

    def test_password_login_returns_pending_login_by_code_and_emails_six_digit_code(self):
        response = self.start_login(self.client, self.user.email)

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertFalse(body['meta']['is_authenticated'])
        self.assertIn({'id': 'login_by_code', 'is_pending': True}, body['data']['flows'])
        self.assertNotIn('token', body['data'])
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertEqual(len(self.login_codes(self.user.email)), 1)

        session = self.session(self.client)
        self.assertFalse(session['meta']['is_authenticated'])
        self.assertIn('login_by_code', self.pending_flow_ids(session))

    def test_wrong_password_does_not_send_code_or_start_flow(self):
        response = self.start_login(self.client, self.user.email, password='Wrong-Password-000!')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(mail.outbox, [])
        session = self.session(self.client)
        self.assertFalse(session['meta']['is_authenticated'])
        self.assertNotIn('login_by_code', self.pending_flow_ids(session))

    def test_valid_code_authenticates_session_without_issuing_token(self):
        response = self.complete_login()

        body = response.json()
        self.assertTrue(body['meta']['is_authenticated'])
        self.assertNotIn('token', body['data'])
        self.assertTrue(self.session(self.client)['meta']['is_authenticated'])
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_code_is_accepted_as_plain_six_digits(self):
        code = self.start_pending_login()

        self.assertRegex(code, r'^\d{6}$')
        self.assertEqual(self.confirm_code(self.client, code).status_code, 200)

    def test_four_invalid_attempts_still_allow_valid_code(self):
        code = self.start_pending_login()

        for _ in range(4):
            self.assertEqual(self.confirm_code(self.client, self.wrong_code(code)).status_code, 400)

        self.assertEqual(self.confirm_code(self.client, code).status_code, 200)

    def test_fifth_invalid_attempt_ends_login_flow(self):
        code = self.start_pending_login()

        for _ in range(5):
            self.confirm_code(self.client, self.wrong_code(code))
        response = self.confirm_code(self.client, code)

        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(self.session(self.client)['meta']['is_authenticated'])

    def test_code_is_valid_just_before_ten_minutes(self):
        code = self.start_pending_login()
        clock = mock.Mock(time=mock.Mock(return_value=time.time() + 9 * 60 + 50))

        with mock.patch('allauth.account.internal.flows.code_verification.time', new=clock):
            response = self.confirm_code(self.client, code)

        self.assertEqual(response.status_code, 200)

    def test_code_expires_after_ten_minutes(self):
        code = self.start_pending_login()
        clock = mock.Mock(time=mock.Mock(return_value=time.time() + 10 * 60 + 5))

        with mock.patch('allauth.account.internal.flows.code_verification.time', new=clock):
            response = self.confirm_code(self.client, code)

        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(self.session(self.client)['meta']['is_authenticated'])

    def test_unconfirmed_account_cannot_complete_login(self):
        user = create_user(email='unconfirmed@example.com', confirmed=False)

        response = self.start_login(self.client, user.email)

        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(response.json().get('meta', {}).get('is_authenticated', False))
        self.assertFalse(self.session(self.client)['meta']['is_authenticated'])
        self.assertIn(self.exchange_token(self.client).status_code, UNAUTHENTICATED_STATUSES)

    def test_inactive_account_cannot_start_login_by_code(self):
        user = create_user(email='inactive@example.com', active=False)

        response = self.start_login(self.client, user.email)

        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(response.json().get('meta', {}).get('is_authenticated', False))
        self.assertEqual(self.login_codes(user.email), [])
        self.assertNotIn('login_by_code', self.pending_flow_ids(self.session(self.client)))

    def test_passwordless_code_request_route_is_not_available(self):
        response = self.client.post(
            f'{HEADLESS}/auth/code/request',
            {'email': self.user.email},
            format='json',
            **self.csrf(self.client),
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(mail.outbox, [])

    def test_resend_without_pending_login_is_conflict(self):
        response = self.resend_code(self.client)

        self.assertEqual(response.status_code, 409)
        self.assertEqual(mail.outbox, [])

    def test_initial_send_starts_resend_cooldown(self):
        code = self.start_pending_login()

        self.assertEqual(self.resend_code(self.client).status_code, 429)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.confirm_code(self.client, code).status_code, 200)

    def test_one_resend_after_cooldown_invalidates_old_code(self):
        old_code = self.start_pending_login()
        now = time.time()
        with mock.patch('allauth.core.internal.ratelimit.time.time', return_value=now + 61):
            self.assertEqual(self.resend_code(self.client).status_code, 200)
        new_code = self.login_codes(self.user.email)[-1]
        self.assertEqual(len(mail.outbox), 2)
        with mock.patch('allauth.core.internal.ratelimit.time.time', return_value=now + 122):
            self.assertEqual(self.resend_code(self.client).status_code, 409)
        self.assertEqual(len(mail.outbox), 2)
        if old_code != new_code:
            self.assertEqual(self.confirm_code(self.client, old_code).status_code, 400)
        self.assertEqual(self.confirm_code(self.client, new_code).status_code, 200)

    def test_repeated_password_login_is_rate_limited_without_ending_pending_flow(self):
        self.start_pending_login()
        other_client = self.browser_client()

        self.assertEqual(self.start_login(other_client, self.user.email).status_code, 429)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.confirm_code(self.client, self.login_codes(self.user.email)[0]).status_code, 200)

    def test_local_unconfirmed_flag_blocks_login_even_with_verified_allauth_email(self):
        self.user.is_email_confirmed = False
        self.user.save(update_fields=['is_email_confirmed'])

        response = self.start_login(self.client, self.user.email)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(mail.outbox, [])
        self.assertFalse(self.session(self.client)['meta']['is_authenticated'])

    def test_resend_requires_csrf_token(self):
        self.start_pending_login()

        response = self.resend_code(self.client, with_csrf=False)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_is_throttled_within_sixty_seconds(self):
        self.start_pending_login()

        self.resend_code(self.client)
        throttled = self.resend_code(self.client)

        self.assertEqual(throttled.status_code, 429)
        if 'Retry-After' in throttled:
            self.assertGreater(int(throttled['Retry-After']), 0)
            self.assertLessEqual(int(throttled['Retry-After']), 60)
        self.assertLessEqual(len(self.login_codes(self.user.email)), 2)
        self.assertFalse(self.session(self.client)['meta']['is_authenticated'])

    def test_legacy_password_login_endpoint_does_not_issue_token(self):
        response = APIClient().post(
            '/api/auth/login/',
            {'email': self.user.email, 'password': PASSWORD},
            format='json',
        )

        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(Token.objects.filter(user=self.user).exists())


class TokenExchangeContractTests(HeadlessBrowserMixin, TestCase):
    def setUp(self):
        cache.clear()
        self.user = create_user()
        self.client = self.browser_client()

    def authenticate_with_code(self):
        self.assertEqual(self.start_login(self.client, self.user.email).status_code, 401)
        code = self.login_codes(self.user.email)[-1]
        self.assertEqual(self.confirm_code(self.client, code).status_code, 200)

    def test_exchange_returns_existing_drf_token_and_user(self):
        token, _ = Token.objects.get_or_create(user=self.user)
        self.authenticate_with_code()

        response = self.exchange_token(self.client)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['token'], token.key)
        self.assertEqual(response.data['user']['email'], self.user.email)
        self.assertIn(Role.STUDENT, response.data['user']['roles'])
        self.assertEqual(Token.objects.filter(user=self.user).count(), 1)

    def test_exchange_creates_token_when_missing(self):
        self.authenticate_with_code()

        response = self.exchange_token(self.client)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['token'], Token.objects.get(user=self.user).key)

    def test_exchange_requires_csrf_token(self):
        self.authenticate_with_code()

        response = self.exchange_token(self.client, with_csrf=False)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_exchange_rejected_while_login_code_pending(self):
        self.assertEqual(self.start_login(self.client, self.user.email).status_code, 401)

        response = self.exchange_token(self.client)

        self.assertIn(response.status_code, UNAUTHENTICATED_STATUSES)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_exchange_rejected_without_session(self):
        response = self.exchange_token(self.client)

        self.assertIn(response.status_code, UNAUTHENTICATED_STATUSES)
        self.assertNotIn('token', getattr(response, 'data', None) or {})

    def test_exchange_does_not_accept_drf_token_authentication(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        self.assertIn(self.exchange_token(self.client).status_code, UNAUTHENTICATED_STATUSES)

    def test_exchange_rejects_unconfirmed_admin_session_without_headless_authentication(self):
        for is_superuser in (False, True):
            with self.subTest(is_superuser=is_superuser):
                user = create_user(
                    email=f'admin.session.{is_superuser}@example.com', confirmed=False,
                )
                user.is_staff = True
                user.is_superuser = is_superuser
                user.save(update_fields=['is_staff', 'is_superuser'])
                client = self.browser_client()
                client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')
                self.assertEqual(str(client.session['_auth_user_id']), str(user.pk))
                self.assertTrue(user.is_active)
                self.assertFalse(user.is_email_confirmed)
                self.assertFalse(Token.objects.filter(user=user).exists())

                response = self.exchange_token(client)

                with self.subTest(check='session_rejected'):
                    self.assertIn(response.status_code, UNAUTHENTICATED_STATUSES)
                with self.subTest(check='no_token_in_response'):
                    self.assertNotIn('token', getattr(response, 'data', None) or {})
                with self.subTest(check='no_token_created'):
                    self.assertFalse(Token.objects.filter(user=user).exists())


class ExistingDrfTokenRegressionTests(TestCase):
    def test_existing_drf_token_remains_valid(self):
        user = get_user_model().objects.create_user(
            email='token.user@example.com',
            password=PASSWORD,
            first_name='Token',
            last_name='User',
            is_email_confirmed=True,
        )
        token, _ = Token.objects.get_or_create(user=user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = client.get('/api/auth/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], user.email)

class HeadlessEndpointRestrictionTests(TestCase):
    BLOCKED = (
        ('post', '/auth/password/request'),
        ('post', '/auth/password/reset'),
        ('post', '/auth/reauthenticate'),
        ('post', '/account/password/change'),
        ('post', '/account/email'),
        ('post', '/account/phone'),
        ('post', '/auth/phone/verify'),
        ('post', '/auth/phone/verify/resend'),
    )

    def test_account_management_headless_endpoints_are_not_exposed(self):
        client = APIClient(enforce_csrf_checks=False)
        for method, path in self.BLOCKED:
            with self.subTest(path=path):
                response = getattr(client, method)(f'{HEADLESS}{path}', {}, format='json')
                self.assertEqual(response.status_code, 404)
