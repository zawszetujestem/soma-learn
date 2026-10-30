import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Course(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = 'public', 'Publiczny'
        PRIVATE = 'private', 'Prywatny'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Oczekuje'
        APPROVED = 'approved', 'Zatwierdzony'
        REJECTED = 'rejected', 'Odrzucony'

    _ALLOWED_TRANSITIONS = {
        (ApprovalStatus.PENDING, ApprovalStatus.APPROVED),
        (ApprovalStatus.PENDING, ApprovalStatus.REJECTED),
        (ApprovalStatus.REJECTED, ApprovalStatus.PENDING),
    }
    _REVERIFICATION_TRANSITION = (ApprovalStatus.APPROVED, ApprovalStatus.PENDING)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_courses',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    visibility = models.CharField(max_length=10, choices=Visibility.choices)
    approval_status = models.CharField(
        max_length=10,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    is_active = models.BooleanField(default=True)
    invite_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    _loaded_visibility = None
    _loaded_status = None
    _loaded_title = None
    _loaded_description = None
    _reverification_requested = False

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._remember_guarded_values()
        return instance

    def _remember_guarded_values(self):
        self._loaded_visibility = self.__dict__.get('visibility')
        self._loaded_status = self.__dict__.get('approval_status')
        self._loaded_title = self.__dict__.get('title')
        self._loaded_description = self.__dict__.get('description')

    def _is_approved_public_content_change(self):
        return (
            self.pk is not None
            and self._loaded_status == self.ApprovalStatus.APPROVED
            and self.visibility == self.Visibility.PUBLIC
            and (self.title != self._loaded_title or self.description != self._loaded_description)
        )

    @classmethod
    def is_status_transition_allowed(cls, old, new, *, reverification=False):
        if old == new:
            return True
        if (old, new) in cls._ALLOWED_TRANSITIONS:
            return True
        return reverification and (old, new) == cls._REVERIFICATION_TRANSITION

    def request_reverification(self):
        self._reverification_requested = True
        try:
            self.approval_status = self.ApprovalStatus.PENDING
            self.save()
        finally:
            self._reverification_requested = False

    def save(self, *args, **kwargs):
        if self.pk is not None and self._loaded_visibility is not None:
            if self.visibility != self._loaded_visibility:
                raise ValidationError({'visibility': 'Widoczność kursu nie może zostać zmieniona.'})
        reverification = self._reverification_requested or self._is_approved_public_content_change()
        if reverification and self._loaded_status == self.ApprovalStatus.APPROVED:
            self.approval_status = self.ApprovalStatus.PENDING
        if (
            self.pk is not None
            and self._loaded_status is not None
            and not self.is_status_transition_allowed(
                self._loaded_status,
                self.approval_status,
                reverification=reverification,
            )
        ):
            raise ValidationError({'approval_status': 'Niedozwolona zmiana statusu zatwierdzenia.'})
        if self.visibility == self.Visibility.PRIVATE and not self.invite_token:
            self.invite_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)
        self._remember_guarded_values()


class CourseTask(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(hours__gt=0), name='course_task_hours_positive'),
        ]

    def __str__(self):
        return self.title


class Instance(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Aktywna'
        CLOSED = 'closed', 'Zamknięta'

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='instances')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='course_instances',
    )
    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentored_instances',
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['student'],
                condition=Q(status='active'),
                name='one_active_instance_per_student',
            ),
        ]

    def __str__(self):
        return f'{self.course} / {self.student}'


class InstancePeriod(models.Model):
    instance = models.ForeignKey(Instance, on_delete=models.CASCADE, related_name='periods')
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['started_at', 'id']


class InstanceTask(models.Model):
    class Status(models.TextChoices):
        TODO = 'todo', 'Do zrobienia'
        IN_PROGRESS = 'in_progress', 'W trakcie'
        DONE = 'done', 'Zrobione'

    instance = models.ForeignKey(Instance, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.TODO)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(hours__gt=0), name='instance_task_hours_positive'),
        ]

    def __str__(self):
        return self.title
