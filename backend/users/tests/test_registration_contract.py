import re
from importlib import import_module
from types import SimpleNamespace
from urllib.parse import unquote, urlparse

from django.apps import apps
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from users.models import Role, User

HEADLESS = '/_allauth/browser/v1'
PASSWORD = 'Long-Unique-Password-482!'
FRONTEND_CONFIRM_PATH = '/potwierdzenie-email/'
CONFIRM_LINK_RE = re.compile(r'https?://[^\s"\'<>]+' + re.escape(FRONTEND_CONFIRM_PATH) + r'[^\s"\'<>]+')


class EmailConfirmationMixin:
    def email_address(self, user):
        return apps.get_model('account', 'EmailAddress').objects.get(user=user, email=user.email)

    def confirmation_key(self, message):
        match = CONFIRM_LINK_RE.search(message.body)
        self.assertIsNotNone(match, 'Confirmation mail must link to the frontend confirm page.')
        path = urlparse(match.group(0)).path
        self.assertTrue(path.startswith(FRONTEND_CONFIRM_PATH))
        key = unquote(path[len(FRONTEND_CONFIRM_PATH):].strip('/'))
        self.assertTrue(key)
        return key

    def browser_client(self):
        client = APIClient(enforce_csrf_checks=True)
        client.get(f'{HEADLESS}/auth/session')
        self.assertIn('csrftoken', client.cookies, 'Headless session GET must set the CSRF cookie.')
        return client

    def csrf(self, client):
        return {'HTTP_X_CSRFTOKEN': client.cookies['csrftoken'].value}


class RegistrationContractTests(EmailConfirmationMixin, TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def registration_data(self, **overrides):
        data = {
            'email': 'new.student@example.com',
            'first_name': 'New',
            'last_name': 'Student',
            'password': PASSWORD,
            'role': 'student',
        }
        data.update(overrides)
        return data

    def register(self, **overrides):
        return self.client.post('/api/auth/register/', self.registration_data(**overrides), format='json')

    def test_student_registration_creates_unverified_allauth_email_and_sends_frontend_link(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertNotIn('token', response.data)
        user = User.objects.get(email='new.student@example.com')
        self.assertTrue(user.has_role(Role.STUDENT))
        self.assertFalse(user.is_email_confirmed)
        self.assertTrue(user.check_password(PASSWORD))
        email_address = self.email_address(user)
        self.assertTrue(email_address.primary)
        self.assertFalse(email_address.verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [user.email])
        self.confirmation_key(mail.outbox[0])
        self.assertNotIn('/api/auth/verify-email/', mail.outbox[0].body)

    def test_registration_does_not_authenticate_session(self):
        self.register()

        session = self.client.get(f'{HEADLESS}/auth/session')

        self.assertEqual(session.status_code, 401)
        self.assertFalse(session.json()['meta']['is_authenticated'])

    def test_registration_canonicalizes_user_and_allauth_email_to_lowercase(self):
        response = self.register(email='Student.Case@Example.com')

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email__iexact='student.case@example.com')
        address = apps.get_model('account', 'EmailAddress').objects.get(user=user)
        with self.subTest(model='User'):
            self.assertEqual(user.email, 'student.case@example.com')
        with self.subTest(model='EmailAddress'):
            self.assertEqual(address.email, 'student.case@example.com')

    def test_registration_rejects_case_insensitive_duplicate_email(self):
        first = self.register(email='Student.Case@Example.com')
        self.assertEqual(first.status_code, 201)
        user = User.objects.get(email__iexact='student.case@example.com')
        users_before = User.objects.count()
        addresses = apps.get_model('account', 'EmailAddress').objects
        addresses_before = addresses.count()

        response = self.register(email='student.case@example.com')

        with self.subTest(check='validation_error'):
            self.assertEqual(response.status_code, 400)
            self.assertIn('email', response.data)
        with self.subTest(check='no_duplicate_user'):
            self.assertEqual(User.objects.count(), users_before)
            self.assertEqual(
                list(User.objects.filter(email__iexact='student.case@example.com').values_list('pk', flat=True)),
                [user.pk],
            )
        with self.subTest(check='no_duplicate_email_address'):
            self.assertEqual(addresses.count(), addresses_before)

    def test_parent_registers_as_mentor_with_specialization(self):
        response = self.register(email='parent@example.com', role='mentor', specialization='Mathematics')

        self.assertEqual(response.status_code, 201)
        parent = User.objects.get(email='parent@example.com')
        self.assertTrue(parent.has_role(Role.MENTOR))
        self.assertFalse(parent.has_role(Role.STUDENT))
        self.assertEqual(parent.specialization, 'Mathematics')
        self.assertFalse(parent.is_email_confirmed)
        self.assertFalse(self.email_address(parent).verified)

    def test_mentor_registration_requires_specialization(self):
        response = self.register(email='mentor@example.com', role='mentor')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='mentor@example.com').exists())
        self.assertEqual(mail.outbox, [])

    def test_only_student_and_mentor_roles_can_register(self):
        for role in (Role.OWNER, Role.ADMIN, 'parent'):
            with self.subTest(role=role):
                response = self.register(email=f'{role}@example.com', role=role, specialization='X')

                self.assertEqual(response.status_code, 400)
                self.assertFalse(User.objects.filter(email=f'{role}@example.com').exists())

    def test_age_and_consent_fields_are_not_stored(self):
        response = self.register(age=12, consent=True, parental_consent=True)

        if response.status_code == 201:
            self.assertIsNone(User.objects.get(email='new.student@example.com').age)
            self.assertNotIn('age', response.data)
        else:
            self.assertEqual(response.status_code, 400)
            self.assertFalse(User.objects.filter(email='new.student@example.com').exists())

    def test_registration_enforces_django_password_validators(self):
        response = self.register(password='password')

        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(email='new.student@example.com').exists())
        self.assertEqual(mail.outbox, [])


class HeadlessEmailVerificationContractTests(EmailConfirmationMixin, TestCase):
    def setUp(self):
        cache.clear()
        response = APIClient().post(
            '/api/auth/register/',
            {
                'email': 'pending@example.com',
                'first_name': 'Pending',
                'last_name': 'User',
                'password': PASSWORD,
                'role': 'student',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.user = User.objects.get(email='pending@example.com')
        self.key = self.confirmation_key(mail.outbox[-1])
        self.client = self.browser_client()

    def assert_unverified(self):
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_confirmed)
        self.assertFalse(self.email_address(self.user).verified)

    def test_headless_get_does_not_mutate(self):
        response = self.client.get(
            f'{HEADLESS}/auth/email/verify',
            HTTP_X_EMAIL_VERIFICATION_KEY=self.key,
        )

        self.assertEqual(response.status_code, 200)
        self.assert_unverified()

    def test_headless_post_verifies_email_and_syncs_user_flag_without_login(self):
        response = self.client.post(
            f'{HEADLESS}/auth/email/verify',
            {'key': self.key},
            format='json',
            **self.csrf(self.client),
        )

        self.assertIn(response.status_code, (200, 401))
        self.assertFalse(response.json()['meta']['is_authenticated'])
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_confirmed)
        self.assertTrue(self.email_address(self.user).verified)

    def test_headless_post_requires_csrf_token(self):
        response = self.client.post(f'{HEADLESS}/auth/email/verify', {'key': self.key}, format='json')

        self.assertEqual(response.status_code, 403)
        self.assert_unverified()

    def test_headless_post_rejects_invalid_key(self):
        response = self.client.post(
            f'{HEADLESS}/auth/email/verify',
            {'key': 'invalid-key'},
            format='json',
            **self.csrf(self.client),
        )

        self.assertEqual(response.status_code, 400)
        self.assert_unverified()

    def test_legacy_post_confirms_both_user_and_allauth_email(self):
        response = APIClient().post(
            '/api/auth/verify-email/',
            {
                'uid': urlsafe_base64_encode(force_bytes(self.user.pk)),
                'token': default_token_generator.make_token(self.user),
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_confirmed)
        self.assertTrue(self.email_address(self.user).verified)

    def test_legacy_get_redirects_to_frontend_without_mutation(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = APIClient().get('/api/auth/verify-email/', {'uid': uid, 'token': token})

        self.assertIn(response.status_code, (301, 302, 303, 307, 308))
        self.assertTrue(urlparse(response['Location']).path.startswith(FRONTEND_CONFIRM_PATH.rstrip('/')))
        self.assert_unverified()


class ResendEmailVerificationContractTests(EmailConfirmationMixin, TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def create_user(self, email, verified):
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            first_name='Existing',
            last_name='User',
            is_email_confirmed=verified,
        )
        apps.get_model('account', 'EmailAddress').objects.create(
            user=user, email=email, primary=True, verified=verified,
        )
        return user

    def resend(self, email):
        return self.client.post('/api/auth/verify-email/resend/', {'email': email}, format='json')

    def test_resend_sends_frontend_confirmation_link_to_unverified_account(self):
        user = self.create_user('existing@example.com', verified=False)

        response = self.resend(user.email)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [user.email])
        self.confirmation_key(mail.outbox[0])

    def test_resend_response_does_not_disclose_account_state(self):
        self.create_user('unverified@example.com', verified=False)
        self.create_user('verified@example.com', verified=True)

        responses = [
            self.resend(email)
            for email in ('unverified@example.com', 'verified@example.com', 'unknown@example.com')
        ]

        for response in responses:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, responses[0].data)
        self.assertEqual([message.to for message in mail.outbox], [['unverified@example.com']])


class AllauthEmailBackfillContractTests(TestCase):
    def backfill(self):
        migration = import_module('users.migrations.0002_backfill_allauth_emails')
        migration.backfill_email_addresses(apps, SimpleNamespace(connection=connection))

    def create_user(self, email, confirmed):
        return User.objects.create_user(
            email=email, password=PASSWORD, first_name='Existing', last_name='User',
            is_email_confirmed=confirmed,
        )

    def test_backfill_canonicalizes_legacy_user_and_allauth_email_to_lowercase(self):
        user = self.create_user('legacy.case@example.com', True)
        User.objects.filter(pk=user.pk).update(email='Legacy.Case@Example.com')

        self.backfill()
        self.backfill()

        user.refresh_from_db()
        address = apps.get_model('account', 'EmailAddress').objects.get(user=user)
        with self.subTest(model='User'):
            self.assertEqual(user.email, 'legacy.case@example.com')
        with self.subTest(model='EmailAddress'):
            self.assertEqual(address.email, 'legacy.case@example.com')
            self.assertTrue(address.primary)
            self.assertTrue(address.verified)

    def test_backfill_preserves_users_passwords_and_tokens_and_syncs_confirmation(self):
        confirmed = self.create_user('CONFIRMED@example.com', True)
        pending = self.create_user('pending@example.com', False)
        token = Token.objects.create(user=confirmed)
        old_password = confirmed.password

        self.backfill()
        self.backfill()

        addresses = apps.get_model('account', 'EmailAddress').objects
        self.assertTrue(addresses.get(user=confirmed, primary=True).verified)
        self.assertFalse(addresses.get(user=pending, primary=True).verified)
        self.assertEqual(addresses.get(user=confirmed).email, 'confirmed@example.com')
        confirmed.refresh_from_db()
        self.assertEqual(confirmed.password, old_password)
        self.assertEqual(Token.objects.get(user=confirmed).key, token.key)

    def test_duplicate_case_insensitive_emails_fail_before_writing(self):
        self.create_user('duplicate@example.com', True)
        legacy = self.create_user('duplicate.legacy@example.com', False)
        User.objects.filter(pk=legacy.pk).update(email='DUPLICATE@example.com')
        addresses = apps.get_model('account', 'EmailAddress').objects
        count_before = addresses.count()

        with self.assertRaisesRegex(RuntimeError, 'Resolve case-insensitive duplicate user emails'):
            self.backfill()

        self.assertEqual(addresses.count(), count_before)

    def test_post_migrate_superuser_has_primary_verified_allauth_email(self):
        user = User.objects.filter(is_superuser=True).get()

        address = apps.get_model('account', 'EmailAddress').objects.get(user=user, primary=True)

        self.assertTrue(user.is_email_confirmed)
        self.assertTrue(address.verified)