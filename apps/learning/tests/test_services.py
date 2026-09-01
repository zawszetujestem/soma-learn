from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.learning.models import Course, CourseInstance, Invitation, Relationship
from apps.learning.services import (
    EmailMismatchError,
    InvitationNotUsableError,
    MentorRoleRequired,
    RelationshipParticipantError,
    StudentRoleRequired,
    accept_invitation,
    end_relationship,
    end_relationships_for_user,
    issue_invitation,
    reissue_invitation,
)

User = get_user_model()


class IssueInvitationTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.course = Course.objects.create(title="Matematyka - klasa 8")

    def test_issue_returns_raw_token_and_stores_only_hash(self) -> None:
        invitation, raw_token = issue_invitation(
            mentor=self.mentor, course=self.course, email=self.student.email
        )

        self.assertNotEqual(invitation.token_hash, raw_token)
        self.assertEqual(invitation.expires_at.date(), (timezone.now() + timedelta(days=7)).date())

    def test_issue_creates_instance(self) -> None:
        issue_invitation(mentor=self.mentor, course=self.course, email=self.student.email)

        instance = CourseInstance.objects.get(
            mentor=self.mentor, course=self.course, student_email=self.student.email
        )
        self.assertIsNone(instance.student)

    def test_issue_reuses_instance_on_resend(self) -> None:
        issue_invitation(mentor=self.mentor, course=self.course, email=self.student.email)
        issue_invitation(mentor=self.mentor, course=self.course, email=self.student.email)

        self.assertEqual(
            CourseInstance.objects.filter(
                mentor=self.mentor, course=self.course, student_email=self.student.email
            ).count(),
            1,
        )

    def test_non_mentor_cannot_issue(self) -> None:
        self.student.is_student = True
        self.student.save(update_fields=["is_student"])

        with self.assertRaises(MentorRoleRequired):
            issue_invitation(mentor=self.student, course=self.course, email="x@example.com")


class AcceptInvitationTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.course = Course.objects.create(title="Matematyka - klasa 8")
        self.invitation, self.raw_token = issue_invitation(
            mentor=self.mentor, course=self.course, email=self.student.email
        )

    def test_happy_path_creates_active_relationship_and_pins_student(self) -> None:
        relationship = accept_invitation(raw_token=self.raw_token, student=self.student)

        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.status, Invitation.Status.ACCEPTED)
        self.assertEqual(relationship.status, Relationship.Status.ACTIVE)
        self.assertEqual(relationship.instance.mentor_id, self.mentor.pk)
        self.assertEqual(relationship.instance.student_id, self.student.pk)

    def test_non_student_cannot_accept(self) -> None:
        self.student.is_student = False
        self.student.save(update_fields=["is_student"])

        with self.assertRaises(StudentRoleRequired):
            accept_invitation(raw_token=self.raw_token, student=self.student)

    def test_email_mismatch_rejected(self) -> None:
        stranger = User.objects.create_user(email="other@example.com", password="pass1234")

        with self.assertRaises(EmailMismatchError):
            accept_invitation(raw_token=self.raw_token, student=stranger)

    def test_expired_invitation_rejected(self) -> None:
        self.invitation.expires_at = timezone.now() - timedelta(seconds=1)
        self.invitation.save(update_fields=["expires_at"])

        with self.assertRaises(InvitationNotUsableError):
            accept_invitation(raw_token=self.raw_token, student=self.student)

    def test_unknown_token_rejected(self) -> None:
        with self.assertRaises(InvitationNotUsableError):
            accept_invitation(raw_token="not-a-real-token", student=self.student)

    def test_double_accept_rejected(self) -> None:
        accept_invitation(raw_token=self.raw_token, student=self.student)

        with self.assertRaises(InvitationNotUsableError):
            accept_invitation(raw_token=self.raw_token, student=self.student)


class ReissueInvitationTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.mentor.is_mentor = True
        self.mentor.save(update_fields=["is_mentor"])
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.course = Course.objects.create(title="Matematyka - klasa 8")
        self.invitation, self.raw_token = issue_invitation(
            mentor=self.mentor, course=self.course, email=self.student.email
        )

    def test_reissue_revokes_previous_and_returns_new_token(self) -> None:
        new_invitation, new_token = reissue_invitation(
            mentor=self.mentor, course=self.course, email=self.student.email
        )

        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.status, Invitation.Status.REVOKED)
        self.assertNotEqual(new_invitation.pk, self.invitation.pk)
        self.assertNotEqual(new_token, self.raw_token)

    def test_old_token_stops_working_after_reissue(self) -> None:
        reissue_invitation(mentor=self.mentor, course=self.course, email=self.student.email)

        with self.assertRaises(InvitationNotUsableError):
            accept_invitation(raw_token=self.raw_token, student=self.student)


class EndRelationshipTests(TestCase):
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
        self.relationship = Relationship.objects.create(
            mentor=self.mentor, student=self.student, instance=self.instance
        )

    def test_mentor_can_end(self) -> None:
        relationship = end_relationship(relationship=self.relationship, actor=self.mentor)

        self.assertEqual(relationship.status, Relationship.Status.ENDED)
        self.assertIsNotNone(relationship.ended_at)

    def test_student_can_end(self) -> None:
        relationship = end_relationship(relationship=self.relationship, actor=self.student)

        self.assertEqual(relationship.status, Relationship.Status.ENDED)

    def test_stranger_cannot_end(self) -> None:
        stranger = User.objects.create_user(email="stranger@example.com", password="pass1234")

        with self.assertRaises(RelationshipParticipantError):
            end_relationship(relationship=self.relationship, actor=stranger)


class EndRelationshipsForUserTests(TestCase):
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
        self.relationship = Relationship.objects.create(
            mentor=self.mentor, student=self.student, instance=self.instance
        )

    def test_ends_all_active_relationships_for_user(self) -> None:
        ended_count = end_relationships_for_user(user=self.student)

        self.relationship.refresh_from_db()
        self.assertEqual(ended_count, 1)
        self.assertEqual(self.relationship.status, Relationship.Status.ENDED)
        self.assertIsNotNone(self.relationship.ended_at)

    def test_completed_relationship_audit_survives_account_deletion(self) -> None:
        end_relationship(relationship=self.relationship, actor=self.mentor)
        self.relationship.refresh_from_db()
        mentor_id = self.relationship.mentor_id
        student_id = self.relationship.student_id
        instance_id = self.relationship.instance_id
        started_at = self.relationship.started_at
        ended_at = self.relationship.ended_at

        self.student.soft_delete()
        self.relationship.refresh_from_db()

        self.assertEqual(self.relationship.mentor_id, mentor_id)
        self.assertEqual(self.relationship.student_id, student_id)
        self.assertEqual(self.relationship.instance_id, instance_id)
        self.assertEqual(self.relationship.status, Relationship.Status.ENDED)
        self.assertEqual(self.relationship.started_at, started_at)
        self.assertEqual(self.relationship.ended_at, ended_at)