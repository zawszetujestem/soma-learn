from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

User = get_user_model()


class UserModelTests(TestCase):
    def test_auth_user_model_points_to_accounts_user(self) -> None:
        self.assertEqual(settings.AUTH_USER_MODEL, "accounts.User")

    def test_email_is_unique(self) -> None:
        User.objects.create_user(email="duplicate@example.com", password="pass1234")

        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="duplicate@example.com", password="pass1234")

    def test_user_can_hold_both_roles(self) -> None:
        user = User.objects.create_user(email="mentor@example.com", password="pass1234")
        user.is_mentor = True
        user.save(update_fields=["is_mentor"])
        user.refresh_from_db()

        self.assertTrue(user.is_student)
        self.assertTrue(user.is_mentor)

    def test_str_returns_email(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")

        self.assertEqual(str(user), "student@example.com")
