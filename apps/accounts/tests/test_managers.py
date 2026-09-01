from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class UserManagerTests(TestCase):
    def test_create_user_uses_email_as_login(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")

        self.assertEqual(User.USERNAME_FIELD, "email")
        self.assertEqual(user.email, "student@example.com")
        self.assertTrue(user.check_password("pass1234"))

    def test_create_user_normalizes_email_domain(self) -> None:
        user = User.objects.create_user(email="Student@Example.COM", password="pass1234")

        self.assertEqual(user.email, "Student@example.com")

    def test_create_user_gets_student_role_by_default(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")

        self.assertTrue(user.is_student)
        self.assertFalse(user.is_mentor)

    def test_create_user_is_not_staff_nor_superuser(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")

        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_requires_email(self) -> None:
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="pass1234")

    def test_create_superuser_contract(self) -> None:
        admin = User.objects.create_superuser(email="admin@example.com", password="pass1234")

        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_create_superuser_rejects_non_staff(self) -> None:
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com", password="pass1234", is_staff=False
            )

    def test_create_superuser_rejects_non_superuser(self) -> None:
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com", password="pass1234", is_superuser=False
            )
