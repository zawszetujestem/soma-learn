import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

User = get_user_model()


class AuthApiTests(TestCase):
    def test_login_returns_user_on_valid_credentials(self) -> None:
        User.objects.create_user(email="mentor@example.com", password="pass1234")

        response = self.client.post(
            reverse("accounts:api-login"),
            data=json.dumps({"email": "mentor@example.com", "password": "pass1234"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "mentor@example.com")

    def test_login_rejects_bad_credentials(self) -> None:
        response = self.client.post(
            reverse("accounts:api-login"),
            data=json.dumps({"email": "ghost@example.com", "password": "wrong"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_login_rejects_invalid_json(self) -> None:
        response = self.client.post(
            reverse("accounts:api-login"),
            data="{not json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_register_creates_and_logs_in(self) -> None:
        response = self.client.post(
            reverse("accounts:api-register"),
            data=json.dumps(
                {
                    "email": "new.student@example.com",
                    "password1": "strong-pass-123",
                    "password2": "strong-pass-123",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["email"], "new.student@example.com")
        self.assertTrue(User.objects.filter(email="new.student@example.com").exists())

    def test_register_rejects_mismatched_passwords(self) -> None:
        response = self.client.post(
            reverse("accounts:api-register"),
            data=json.dumps(
                {
                    "email": "x@example.com",
                    "password1": "strong-pass-123",
                    "password2": "different-pass",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password2", response.json()["errors"])

    def test_me_returns_401_when_anonymous(self) -> None:
        response = self.client.get(reverse("accounts:api-me"))

        self.assertEqual(response.status_code, 401)

    def test_me_returns_user_when_authenticated(self) -> None:
        user = User.objects.create_user(email="student@example.com", password="pass1234")
        self.client.force_login(user)

        response = self.client.get(reverse("accounts:api-me"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "student@example.com")
