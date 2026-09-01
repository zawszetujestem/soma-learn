from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from apps.learning.models import Course, CourseInstance, Invitation, Relationship

User = get_user_model()


class CourseTests(TestCase):
    def test_str_returns_title(self) -> None:
        course = Course.objects.create(title="Matematyka - klasa 8")

        self.assertEqual(str(course), "Matematyka - klasa 8")

    def test_title_is_unique(self) -> None:
        Course.objects.create(title="Matematyka - klasa 8")

        with self.assertRaises(IntegrityError), transaction.atomic():
            Course.objects.create(title="Matematyka - klasa 8")


class CourseInstanceTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.course = Course.objects.create(title="Matematyka - klasa 8")

    def test_str_uses_email_when_student_absent(self) -> None:
        instance = CourseInstance.objects.create(
            mentor=self.mentor, course=self.course, student_email="student@example.com"
        )

        self.assertIn("student@example.com", str(instance))

    def test_unique_per_mentor_course_email(self) -> None:
        CourseInstance.objects.create(
            mentor=self.mentor, course=self.course, student_email="a@example.com"
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            CourseInstance.objects.create(
                mentor=self.mentor, course=self.course, student_email="a@example.com"
            )

    def test_same_email_other_course_is_separate_instance(self) -> None:
        other_course = Course.objects.create(title="Fizyka - klasa 8")

        first = CourseInstance.objects.create(
            mentor=self.mentor, course=self.course, student_email="a@example.com"
        )
        second = CourseInstance.objects.create(
            mentor=self.mentor, course=other_course, student_email="a@example.com"
        )

        self.assertNotEqual(first.pk, second.pk)


class InvitationTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.course = Course.objects.create(title="Matematyka - klasa 8")
        self.instance = CourseInstance.objects.create(
            mentor=self.mentor, course=self.course, student_email="student@example.com"
        )

    def test_expires_at_is_stored_and_is_expired_reflects_it(self) -> None:
        future = Invitation.objects.create(
            mentor=self.mentor,
            instance=self.instance,
            email="student@example.com",
            token_hash="a" * 64,
            expires_at=timezone.now() + timedelta(days=7),
        )
        past = Invitation.objects.create(
            mentor=self.mentor,
            instance=self.instance,
            email="student@example.com",
            token_hash="b" * 64,
            expires_at=timezone.now() - timedelta(seconds=1),
        )

        self.assertFalse(future.is_expired)
        self.assertTrue(past.is_expired)

    def test_is_expired_at_exact_expiry_moment(self) -> None:
        invitation = Invitation.objects.create(
            mentor=self.mentor,
            instance=self.instance,
            email="student@example.com",
            token_hash="c" * 64,
            expires_at=timezone.now(),
        )

        self.assertTrue(invitation.is_expired)


class RelationshipTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.course = Course.objects.create(title="Matematyka - klasa 8")
        self.instance = CourseInstance.objects.create(
            mentor=self.mentor,
            course=self.course,
            student_email=self.student.email,
            student=self.student,
        )

    def test_single_active_relationship_per_instance(self) -> None:
        Relationship.objects.create(
            mentor=self.mentor, student=self.student, instance=self.instance
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Relationship.objects.create(
                mentor=self.mentor, student=self.student, instance=self.instance
            )

    def test_ended_relationship_does_not_block_new_active_one(self) -> None:
        Relationship.objects.create(
            mentor=self.mentor,
            student=self.student,
            instance=self.instance,
            status=Relationship.Status.ENDED,
        )

        relationship = Relationship.objects.create(
            mentor=self.mentor, student=self.student, instance=self.instance
        )

        self.assertEqual(relationship.status, Relationship.Status.ACTIVE)