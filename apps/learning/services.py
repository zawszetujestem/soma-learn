from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta
from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from .models import Course, CourseInstance, Invitation, Relationship

if TYPE_CHECKING:
    from apps.accounts.models import User

UserModel = get_user_model()

INVITATION_TTL = timedelta(days=7)


class ServiceError(Exception):
    pass


class MentorRoleRequired(ServiceError):
    pass


class StudentRoleRequired(ServiceError):
    pass


class EmailMismatchError(ServiceError):
    pass


class InvitationNotUsableError(ServiceError):
    pass


class RelationshipParticipantError(ServiceError):
    pass


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _normalize_email(email: str) -> str:
    return UserModel.objects.normalize_email(email)


def _get_or_create_instance(*, mentor: User, course: Course, email: str) -> CourseInstance:
    return CourseInstance.objects.get_or_create(
        mentor=mentor,
        course=course,
        student_email=_normalize_email(email),
    )[0]


def issue_invitation(*, mentor: User, course: Course, email: str) -> tuple[Invitation, str]:
    if not mentor.is_mentor:
        raise MentorRoleRequired("Invitations may only be issued by mentors.")
    instance = _get_or_create_instance(mentor=mentor, course=course, email=email)
    raw_token = secrets.token_urlsafe(32)
    invitation = Invitation.objects.create(
        mentor=mentor,
        instance=instance,
        email=_normalize_email(email),
        token_hash=_hash_token(raw_token),
        expires_at=timezone.now() + INVITATION_TTL,
    )
    return invitation, raw_token


@transaction.atomic
def reissue_invitation(*, mentor: User, course: Course, email: str) -> tuple[Invitation, str]:
    if not mentor.is_mentor:
        raise MentorRoleRequired("Invitations may only be issued by mentors.")
    instance = _get_or_create_instance(mentor=mentor, course=course, email=email)
    Invitation.objects.filter(
        instance=instance,
        status=Invitation.Status.PENDING,
    ).update(status=Invitation.Status.REVOKED)
    raw_token = secrets.token_urlsafe(32)
    invitation = Invitation.objects.create(
        mentor=mentor,
        instance=instance,
        email=_normalize_email(email),
        token_hash=_hash_token(raw_token),
        expires_at=timezone.now() + INVITATION_TTL,
    )
    return invitation, raw_token


@transaction.atomic
def accept_invitation(*, raw_token: str, student: User) -> Relationship:
    if not student.is_student:
        raise StudentRoleRequired("Invitations may only be accepted by students.")
    try:
        invitation = Invitation.objects.select_for_update().get(
            token_hash=_hash_token(raw_token), status=Invitation.Status.PENDING
        )
    except Invitation.DoesNotExist as exc:
        raise InvitationNotUsableError("Invitation is not pending or does not exist.") from exc
    if invitation.expires_at <= timezone.now():
        raise InvitationNotUsableError("Invitation has expired.")
    if _normalize_email(invitation.email) != _normalize_email(student.email):
        raise EmailMismatchError("Invitation email does not match the accepting account.")
    instance = invitation.instance
    instance.student = student
    instance.save(update_fields=["student"])
    if Relationship.objects.filter(
        mentor=instance.mentor,
        student=student,
        instance=instance,
        status=Relationship.Status.ACTIVE,
    ).exists():
        raise InvitationNotUsableError(
            "Student already has an active relationship for this instance."
        )
    invitation.status = Invitation.Status.ACCEPTED
    invitation.save(update_fields=["status"])
    return Relationship.objects.create(mentor=instance.mentor, student=student, instance=instance)


@transaction.atomic
def end_relationship(*, relationship: Relationship, actor: User) -> Relationship:
    if actor.pk not in {relationship.mentor_id, relationship.student_id}:
        raise RelationshipParticipantError("Only relationship participants may end it.")
    if relationship.status != Relationship.Status.ACTIVE:
        raise RelationshipParticipantError("Relationship is not active.")
    relationship.status = Relationship.Status.ENDED
    relationship.ended_at = timezone.now()
    relationship.save(update_fields=["status", "ended_at"])
    return relationship


@transaction.atomic
def end_relationships_for_user(*, user: User) -> int:
    now = timezone.now()
    ended_as_mentor = Relationship.objects.filter(
        mentor=user, status=Relationship.Status.ACTIVE
    ).update(status=Relationship.Status.ENDED, ended_at=now)
    ended_as_student = Relationship.objects.filter(
        student=user, status=Relationship.Status.ACTIVE
    ).update(status=Relationship.Status.ENDED, ended_at=now)
    return ended_as_mentor + ended_as_student


def students_with_active_relationship(*, mentor: User, course: Course) -> QuerySet[User]:
    return (
        UserModel.objects.filter(
            is_active=True,
            learning_relationships__mentor=mentor,
            learning_relationships__instance__course=course,
            learning_relationships__status=Relationship.Status.ACTIVE,
        )
        .distinct()
        .order_by("pk")
    )


@transaction.atomic
def assign_student(
    *, mentor: User, course: Course, email: str
) -> tuple[CourseInstance, bool, str | None]:
    if not mentor.is_mentor:
        raise MentorRoleRequired("Only mentors may assign students to courses.")
    normalized = _normalize_email(email)
    student = UserModel.objects.filter(email__iexact=normalized, is_active=True).first()
    if student is not None:
        instance = _get_or_create_instance(mentor=mentor, course=course, email=normalized)
        instance.student = student
        instance.save(update_fields=["student"])
        return instance, False, None
    invitation, raw_token = reissue_invitation(mentor=mentor, course=course, email=normalized)
    return invitation.instance, True, raw_token


def get_invitation_for_token(raw_token: str) -> Invitation | None:
    return (
        Invitation.objects.filter(token_hash=_hash_token(raw_token))
        .select_related("instance", "instance__course", "instance__mentor")
        .first()
    )


def send_invitation_email(*, email: str, invitation_url: str) -> None:
    send_mail(
        subject="Zaproszenie do kursu SOMA Learn",
        message=(
            "Zostałeś(aś) zaproszony(-a) do kursu w aplikacji SOMA Learn.\n\n"
            f"Aby dołączyć do kursu, otwórz poniższy link:\n{invitation_url}\n"
        ),
        from_email=None,
        recipient_list=[email],
    )