import uuid
from typing import ClassVar

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    is_student = models.BooleanField(default=True)
    is_mentor = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email

    def soft_delete(self) -> None:
        if self.deleted_at is not None:
            return
        self.email = f"deleted-{uuid.uuid4().hex}@deleted.invalid"
        self.set_unusable_password()
        self.is_active = False
        self.is_student = False
        self.is_mentor = False
        self.is_staff = False
        self.is_superuser = False
        self.deleted_at = timezone.now()
        self.save(
            update_fields=[
                "email",
                "password",
                "is_active",
                "is_student",
                "is_mentor",
                "is_staff",
                "is_superuser",
                "deleted_at",
            ]
        )
