from django.test import TestCase
from django.urls import reverse


class HomeTests(TestCase):
    def test_home_returns_200(self) -> None:
        response = self.client.get(reverse("core:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "SOMA")
        self.assertContains(response, reverse("accounts:login"))


class HealthCheckTests(TestCase):
    def test_health_check_returns_ok(self) -> None:
        response = self.client.get(reverse("core:health-check"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
