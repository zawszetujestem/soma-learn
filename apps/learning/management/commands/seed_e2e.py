import json
from pathlib import Path
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.learning.models import Course, CourseInstance

User = get_user_model()

COURSE_TITLE = "Matematyka — klasa 8"
MENTOR_EMAIL = "e2e-mentor@example.com"
STUDENT_EMAIL = "e2e-student@example.com"
STRANGER_EMAIL = "e2e-stranger@example.com"
PASSWORD = "E2ePass123!"


class Command(BaseCommand):
    help = "Seed deterministic E2E users and a single course instance."

    def handle(self, *args: Any, **options: Any) -> None:
        mentor, _ = User.objects.get_or_create(email=MENTOR_EMAIL)
        mentor.is_mentor = True
        mentor.set_password(PASSWORD)
        mentor.save()

        student, _ = User.objects.get_or_create(email=STUDENT_EMAIL)
        student.is_student = True
        student.set_password(PASSWORD)
        student.save()

        stranger, _ = User.objects.get_or_create(email=STRANGER_EMAIL)
        stranger.is_mentor = True
        stranger.set_password(PASSWORD)
        stranger.save()

        course, _ = Course.objects.get_or_create(title=COURSE_TITLE)
        instance, _ = CourseInstance.objects.get_or_create(
            mentor=mentor,
            course=course,
            student_email=student.email,
            defaults={"student": student},
        )
        instance.student = student
        instance.save(update_fields=["student"])

        state_dir = Path("e2e")
        state_dir.mkdir(parents=True, exist_ok=True)
        (state_dir / ".seed-state.json").write_text(
            json.dumps({"instance_pk": instance.pk}), encoding="utf-8"
        )

        self.stdout.write(self.style.SUCCESS(f"Seeded E2E data; instance pk={instance.pk}"))
