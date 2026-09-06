from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from django.urls import reverse

from apps.learning.models import Course, CourseInstance, Invitation
from apps.learning.services import (
    MentorRoleRequired,
    assign_student,
    issue_invitation,
)

User = get_user_model()


class AssignStudentServiceTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.course = Course.objects.create(title="Fizyka — klasa 8", owner=self.mentor)

    def test_assigns_existing_student_directly(self) -> None:
        instance, invited, raw_token = assign_student(
            mentor=self.mentor, course=self.course, email=self.student.email
        )

        self.assertFalse(invited)
        self.assertIsNone(raw_token)
        self.assertEqual(instance.student, self.student)
        self.assertFalse(Invitation.objects.exists())

    def test_unknown_email_creates_invitation(self) -> None:
        instance, invited, raw_token = assign_student(
            mentor=self.mentor, course=self.course, email="new.student@example.com"
        )

        self.assertTrue(invited)
        self.assertIsNotNone(raw_token)
        self.assertIsNone(instance.student)
        self.assertTrue(Invitation.objects.filter(instance=instance).exists())

    def test_multiple_instances_for_same_course(self) -> None:
        assign_student(mentor=self.mentor, course=self.course, email="one@example.com")
        assign_student(mentor=self.mentor, course=self.course, email="two@example.com")

        self.assertEqual(
            CourseInstance.objects.filter(mentor=self.mentor, course=self.course).count(), 2
        )

    def test_non_mentor_cannot_assign(self) -> None:
        with self.assertRaises(MentorRoleRequired):
            assign_student(mentor=self.student, course=self.course, email="x@example.com")


class CourseInstanceCreateViewTests(TestCase):
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
        self.course = Course.objects.create(title="Fizyka — klasa 8", owner=self.mentor)

    def test_mentor_assigns_existing_student_without_email(self) -> None:
        self.client.force_login(self.mentor)

        response = self.client.post(
            reverse("learning:course-instance-create", args=[self.course.pk]),
            data={"email": self.student.email},
        )

        self.assertRedirects(response, reverse("learning:course-list"))
        self.assertEqual(len(mail.outbox), 0)
        instance = CourseInstance.objects.get(mentor=self.mentor, course=self.course)
        self.assertEqual(instance.student, self.student)

    def test_mentor_assigns_unknown_email_and_sends_invitation(self) -> None:
        self.client.force_login(self.mentor)

        response = self.client.post(
            reverse("learning:course-instance-create", args=[self.course.pk]),
            data={"email": "new.student@example.com"},
        )

        self.assertRedirects(response, reverse("learning:course-list"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("new.student@example.com", mail.outbox[0].to)
        instance = CourseInstance.objects.get(
            mentor=self.mentor, course=self.course, student_email="new.student@example.com"
        )
        self.assertIsNone(instance.student)
        self.assertTrue(Invitation.objects.filter(instance=instance).exists())

    def test_student_cannot_assign(self) -> None:
        self.client.force_login(self.student)

        response = self.client.get(
            reverse("learning:course-instance-create", args=[self.course.pk])
        )

        self.assertEqual(response.status_code, 403)

    def test_other_mentor_cannot_assign_to_not_owned_course(self) -> None:
        self.client.force_login(self.other_mentor)

        response = self.client.get(
            reverse("learning:course-instance-create", args=[self.course.pk])
        )

        self.assertEqual(response.status_code, 404)

    def test_anonymous_redirected_to_login(self) -> None:
        response = self.client.get(
            reverse("learning:course-instance-create", args=[self.course.pk])
        )

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("accounts:login"), response.headers["Location"])


class InvitationAcceptViewTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.course = Course.objects.create(title="Fizyka — klasa 8", owner=self.mentor)
        self.invitation, self.raw_token = issue_invitation(
            mentor=self.mentor, course=self.course, email=self.student.email
        )

    def test_student_accepts_and_gets_redirected(self) -> None:
        self.client.force_login(self.student)

        response = self.client.post(
            reverse("learning:invitation-accept", args=[self.raw_token])
        )

        instance = self.invitation.instance
        self.assertRedirects(
            response, reverse("learning:course-entry", args=[instance.pk])
        )
        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.status, Invitation.Status.ACCEPTED)

    def test_email_mismatch_shows_error(self) -> None:
        stranger = User.objects.create_user(email="stranger@example.com", password="pass1234")
        self.client.force_login(stranger)

        response = self.client.post(
            reverse("learning:invitation-accept", args=[self.raw_token])
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "innego adresu e-mail")

    def test_invalid_token_shows_error(self) -> None:
        self.client.force_login(self.student)

        response = self.client.post(
            reverse("learning:invitation-accept", args=["not-a-real-token"])
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "nieważne")

    def test_anonymous_redirected_to_login(self) -> None:
        response = self.client.get(
            reverse("learning:invitation-accept", args=[self.raw_token])
        )

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("accounts:login"), response.headers["Location"])
