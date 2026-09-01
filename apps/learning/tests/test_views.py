from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from apps.learning.models import Course

User = get_user_model()


class CourseViewTests(TestCase):
    def setUp(self) -> None:
        self.course, _ = Course.objects.get_or_create(title="Matematyka — klasa 8")
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")

    def test_anonymous_is_redirected_to_login(self) -> None:
        response = self.client.get(reverse("learning:course-list"))

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("accounts:login"), response.headers["Location"])

    def test_mentor_sees_course_list(self) -> None:
        self.client.force_login(self.mentor)

        response = self.client.get(reverse("learning:course-list"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.course.title)

    def test_student_gets_forbidden(self) -> None:
        self.client.force_login(self.student)

        response = self.client.get(reverse("learning:course-list"))

        self.assertEqual(response.status_code, 403)

    def test_mentor_enters_course(self) -> None:
        self.client.force_login(self.mentor)

        response = self.client.get(reverse("learning:course-entry", args=[self.course.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.course.title)

    def test_student_forbidden_on_course_entry(self) -> None:
        self.client.force_login(self.student)

        response = self.client.get(reverse("learning:course-entry", args=[self.course.pk]))

        self.assertEqual(response.status_code, 403)

    def test_anonymous_redirected_from_course_entry(self) -> None:
        response = self.client.get(reverse("learning:course-entry", args=[self.course.pk]))

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("accounts:login"), response.headers["Location"])
