from django.conf import settings
from django.db import models


class Course(models.Model):
    title = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.title


class Invitation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        ACCEPTED = "accepted"
        REVOKED = "revoked"
        EXPIRED = "expired"

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField()
    token_hash = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_expired(self) -> bool:
        from django.utils import timezone

        return self.expires_at <= timezone.now()

    def __str__(self) -> str:
        return f"{self.email} → {self.course.title}"


class Relationship(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active"
        ENDED = "ended"

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mentorships"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_relationships"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="relationships")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["mentor", "student", "course"],
                condition=models.Q(status="active"),
                name="unique_active_relationship",
            )
        ]

    def __str__(self) -> str:
        return f"{self.mentor} → {self.student} ({self.course.title})"
