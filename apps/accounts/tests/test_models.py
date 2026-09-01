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

    def test_soft_delete_anonymizes_email_and_removes_password(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")
        original_email = user.email

        user.soft_delete()
        user.refresh_from_db()

        self.assertNotEqual(user.email, original_email)
        self.assertTrue(user.email.startswith("deleted-"))
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_student)
        self.assertFalse(user.is_mentor)
        self.assertIsNotNone(user.deleted_at)

    def test_soft_delete_frees_email_for_reuse(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")
        user.soft_delete()

        recreated = User.objects.create_user(email="student@example.com", password="pass1234")

        self.assertNotEqual(recreated.pk, user.pk)
        self.assertEqual(recreated.email, "student@example.com")
