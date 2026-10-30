import re

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

from users.tests.test_auth_contract import HEADLESS, PASSWORD, HeadlessBrowserMixin, create_user

NEW_PASSWORD = 'Brand-New-Password-917!'
RESET_CODE_RE = re.compile(r'(?<!\d)(\d{6})(?!\d)')


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetByCodeContractTests(HeadlessBrowserMixin, TestCase):
    def setUp(self):
        cache.clear()
        mail.outbox = []
        self.user = create_user(email='reset@example.com')
        self.user.set_password(PASSWORD)
        self.user.save()

    def request_reset(self, client, email):
        return client.post(
            f'{HEADLESS}/auth/password/request',
            {'email': email},
            format='json',
            **self.csrf(client),
        )

    def assertResetFlowPending(self, response):
        self.assertIn(response.status_code, (200, 401))
        self.assertIn('password_reset_by_code', self.pending_flow_ids(response.json()))

    def verify_code(self, client, code):
        return client.get(
            f'{HEADLESS}/auth/password/reset',
            HTTP_X_PASSWORD_RESET_KEY=code,
            **self.csrf(client),
        )

    def finish_reset(self, client, code, password):
        return client.post(
            f'{HEADLESS}/auth/password/reset',
            {'key': code, 'password': password},
            format='json',
            **self.csrf(client),
        )

    def reset_code_from_mail(self):
        self.assertEqual(len(mail.outbox), 1)
        match = RESET_CODE_RE.search(mail.outbox[0].body)
        self.assertIsNotNone(match, 'Reset e-mail must contain a 6-digit code.')
        return match.group(1)

    def test_request_sends_reset_code_email_and_returns_pending_flow(self):
        client = self.browser_client()

        response = self.request_reset(client, self.user.email)

        self.assertResetFlowPending(response)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])

    def test_unknown_email_gets_same_response_and_no_mail(self):
        client = self.browser_client()

        response = self.request_reset(client, 'nobody@example.com')

        self.assertResetFlowPending(response)
        self.assertFalse(any(RESET_CODE_RE.search(message.body) for message in mail.outbox))

    def test_wrong_code_is_rejected(self):
        client = self.browser_client()
        self.request_reset(client, self.user.email)

        response = self.verify_code(client, '000000')

        self.assertEqual(response.status_code, 400)

    def test_correct_code_and_new_password_change_password(self):
        client = self.browser_client()
        self.request_reset(client, self.user.email)
        code = self.reset_code_from_mail()

        self.assertIn(self.verify_code(client, code).status_code, (200, 401))
        response = self.finish_reset(client, code, NEW_PASSWORD)

        self.assertIn(response.status_code, (200, 401))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertFalse(self.user.check_password(PASSWORD))

    def test_weak_password_is_rejected_and_password_unchanged(self):
        client = self.browser_client()
        self.request_reset(client, self.user.email)
        code = self.reset_code_from_mail()

        response = self.finish_reset(client, code, '123')

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))
