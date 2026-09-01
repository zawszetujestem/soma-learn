from django.contrib.auth import get_user_model
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

    def test_logout_redirects_to_login(self) -> None:
        user = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.client.force_login(user)

        response = self.client.post(reverse("accounts:logout"))

        self.assertRedirects(response, reverse("accounts:login"))
