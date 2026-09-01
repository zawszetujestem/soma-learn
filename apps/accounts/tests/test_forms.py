from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.forms import MentorLoginForm, RegistrationForm

User = get_user_model()


class MentorLoginFormTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(email="mentor@example.com", password="pass1234")

    def test_login_with_email_and_password(self) -> None:
        form = MentorLoginForm(
            data={"username": "mentor@example.com", "password": "pass1234"}
        )

        self.assertTrue(form.is_valid(), form.errors)

    def test_login_with_wrong_password_fails(self) -> None:
        form = MentorLoginForm(
            data={"username": "mentor@example.com", "password": "wrong-pass"}
        )

        self.assertFalse(form.is_valid())


class RegistrationFormTests(TestCase):
    def test_save_creates_student_without_mentor_role(self) -> None:
        form = RegistrationForm(
            data={
                "email": "New.Student@Example.COM",
                "password1": "strong-pass-123",
                "password2": "strong-pass-123",
            }
        )
        self.assertTrue(form.is_valid(), form.errors)

        user = form.save()

        self.assertTrue(user.is_student)
        self.assertFalse(user.is_mentor)
        self.assertTrue(user.check_password("strong-pass-123"))
        self.assertEqual(user.email, "New.Student@example.com")

    def test_duplicate_email_rejected(self) -> None:
        User.objects.create_user(email="duplicate@example.com", password="pass1234")

        form = RegistrationForm(
            data={
                "email": "duplicate@example.com",
                "password1": "strong-pass-123",
                "password2": "strong-pass-123",
            }
        )

        self.assertFalse(form.is_valid())
        self.assertIn("email", form.errors)

    def test_mismatched_passwords_rejected(self) -> None:
        form = RegistrationForm(
            data={
                "email": "student@example.com",
                "password1": "strong-pass-123",
                "password2": "different-pass",
            }
        )

        self.assertFalse(form.is_valid())
        self.assertIn("password2", form.errors)
