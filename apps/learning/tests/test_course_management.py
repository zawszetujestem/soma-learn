from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User as UserModel
from apps.learning.models import Course

User = get_user_model()


class CourseManagementTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.other_mentor = User.objects.create_user(
            email="other-mentor@example.com", password="pass1234"
        )
        self.other_mentor.is_mentor = True
        self.other_mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")

    def _course(self, mentor: UserModel, title: str) -> Course:
        return Course.objects.create(title=title, owner=mentor)

    def test_mentor_can_create_course(self) -> None:
        self.client.force_login(self.mentor)

        response = self.client.post(
            reverse("learning:course-create"), data={"title": "Fizyka — klasa 8"}
        )

        self.assertRedirects(response, reverse("learning:course-list"))
        self.assertTrue(
            Course.objects.filter(title="Fizyka — klasa 8", owner=self.mentor).exists()
        )

    def test_create_requires_login(self) -> None:
        response = self.client.get(reverse("learning:course-create"))

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("accounts:login"), response.headers["Location"])

    def test_student_cannot_create_course(self) -> None:
        self.client.force_login(self.student)

        response = self.client.get(reverse("learning:course-create"))

        self.assertEqual(response.status_code, 403)

    def test_create_rejects_duplicate_title(self) -> None:
        self._course(self.mentor, "Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.post(
            reverse("learning:course-create"), data={"title": "Fizyka"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Course.objects.filter(title="Fizyka").count(), 1)

    def test_mentor_can_edit_own_course(self) -> None:
        course = self._course(self.mentor, "Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.post(
            reverse("learning:course-edit", args=[course.pk]),
            data={"title": "Fizyka — rozszerzenie"},
        )

        self.assertRedirects(response, reverse("learning:course-list"))
        course.refresh_from_db()
        self.assertEqual(course.title, "Fizyka — rozszerzenie")

    def test_mentor_cannot_edit_other_course(self) -> None:
        course = self._course(self.other_mentor, "Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.get(reverse("learning:course-edit", args=[course.pk]))

        self.assertEqual(response.status_code, 404)

    def test_mentor_can_delete_own_course(self) -> None:
        course = self._course(self.mentor, "Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.post(reverse("learning:course-delete", args=[course.pk]))

        self.assertRedirects(response, reverse("learning:course-list"))
        self.assertFalse(Course.objects.filter(pk=course.pk).exists())

    def test_mentor_cannot_delete_other_course(self) -> None:
        course = self._course(self.other_mentor, "Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.post(reverse("learning:course-delete", args=[course.pk]))

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Course.objects.filter(pk=course.pk).exists())

    def test_student_cannot_edit_course(self) -> None:
        course = self._course(self.mentor, "Fizyka")
        self.client.force_login(self.student)

        response = self.client.get(reverse("learning:course-edit", args=[course.pk]))

        self.assertEqual(response.status_code, 403)

    def test_student_cannot_delete_course(self) -> None:
        course = self._course(self.mentor, "Fizyka")
        self.client.force_login(self.student)

        response = self.client.post(reverse("learning:course-delete", args=[course.pk]))

        self.assertEqual(response.status_code, 403)

    def test_list_shows_owned_course(self) -> None:
        self._course(self.mentor, "Moja Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.get(reverse("learning:course-list"))

        self.assertContains(response, "Moja Fizyka")

    def test_list_hides_other_mentor_course(self) -> None:
        self._course(self.other_mentor, "Cudza Fizyka")
        self.client.force_login(self.mentor)

        response = self.client.get(reverse("learning:course-list"))

        self.assertNotContains(response, "Cudza Fizyka")

    def test_list_hides_management_for_student(self) -> None:
        self.client.force_login(self.student)

        response = self.client.get(reverse("learning:course-list"))

        self.assertNotContains(response, "Dodaj kurs")
