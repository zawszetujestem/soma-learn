from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse

User = get_user_model()


class AccountViewTests(TestCase):
    def test_login_page_renders(self) -> None:
        response = self.client.get(reverse("accounts:login"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Zaloguj")

    def test_register_page_renders(self) -> None:
        response = self.client.get(reverse("accounts:register"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Utwórz konto")

    def test_register_creates_and_logs_in(self) -> None:
        response = self.client.post(
            reverse("accounts:register"),
            data={
                "email": "new.mentor@example.com",
                "password1": "strong-pass-123",
                "password2": "strong-pass-123",
            },
        )

        self.assertRedirects(
            response,
            reverse("learning:course-list"),
            fetch_redirect_response=False,
        )
        self.assertTrue(User.objects.filter(email="new.mentor@example.com").exists())

    def test_register_non_email_integrity_error_propagates(self) -> None:
        with patch(
            "apps.accounts.views.RegistrationForm.save",
            side_effect=IntegrityError("constraint violation unrelated to email"),
        ):
            with self.assertRaises(IntegrityError):
                self.client.post(
                    reverse("accounts:register"),
                    data={
                        "email": "brand.new@example.com",
                        "password1": "strong-pass-123",
                        "password2": "strong-pass-123",
                    },
                )

    def test_logout_redirects_to_login(self) -> None:
        user = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.client.force_login(user)

        response = self.client.post(reverse("accounts:logout"))

        self.assertRedirects(response, reverse("accounts:login"))

    def test_authenticated_user_can_delete_account(self) -> None:
        user = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.client.force_login(user)

        response = self.client.post(reverse("accounts:delete-account"))

        self.assertRedirects(response, reverse("accounts:login"))
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_mentor)
        self.assertIsNotNone(user.deleted_at)

    def test_anonymous_cannot_delete_account(self) -> None:
        response = self.client.post(reverse("accounts:delete-account"))

        self.assertRedirects(
            response,
            f"{reverse('accounts:login')}?next={reverse('accounts:delete-account')}",
        )
