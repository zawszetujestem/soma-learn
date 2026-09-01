import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.apps.registry import Apps


def forward_instances(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    CourseInstance = apps.get_model("learning", "CourseInstance")
    Invitation = apps.get_model("learning", "Invitation")
    Relationship = apps.get_model("learning", "Relationship")

    instances: dict[tuple[int, int, str], object] = {}
    for inv in Invitation.objects.all():
        key = (inv.mentor_id, inv.course_id, inv.email)
        instance = instances.get(key)
        if instance is None:
            instance, _ = CourseInstance.objects.get_or_create(
                mentor_id=inv.mentor_id,
                course_id=inv.course_id,
                student_email=inv.email,
            )
            instances[key] = instance
        inv.instance = instance
        inv.save(update_fields=["instance"])

    for rel in Relationship.objects.all():
        student = rel.student
        key = (rel.mentor_id, rel.course_id, student.email)
        instance = instances.get(key)
        if instance is None:
            instance, _ = CourseInstance.objects.get_or_create(
                mentor_id=rel.mentor_id,
                course_id=rel.course_id,
                student_email=student.email,
                student=student,
            )
            instances[key] = instance
        rel.instance = instance
        rel.save(update_fields=["instance"])


def reverse_instances(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    apps.get_model("learning", "Invitation").objects.update(instance=None)
    apps.get_model("learning", "Relationship").objects.update(instance=None)


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0002_seed_ready_course"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CourseInstance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("student_email", models.EmailField(max_length=254)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("course", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="instances", to="learning.course")),
                ("mentor", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="course_instances", to=settings.AUTH_USER_MODEL)),
                ("student", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="enrolled_instances", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(fields=("mentor", "course", "student_email"), name="unique_course_instance")
                ],
            },
        ),
        migrations.AddField(
            model_name="invitation",
            name="instance",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name="invitations", to="learning.courseinstance"),
        ),
        migrations.AddField(
            model_name="relationship",
            name="instance",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name="relationships", to="learning.courseinstance"),
        ),
        migrations.RunPython(forward_instances, reverse_instances),
        migrations.RemoveConstraint(
            model_name="relationship",
            name="unique_active_relationship",
        ),
        migrations.RemoveField(model_name="invitation", name="course"),
        migrations.RemoveField(model_name="relationship", name="course"),
        migrations.AddConstraint(
            model_name="relationship",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "active")),
                fields=("mentor", "student", "instance"),
                name="unique_active_relationship",
            ),
        ),
        migrations.AlterField(
            model_name="invitation",
            name="instance",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invitations", to="learning.courseinstance"),
        ),
        migrations.AlterField(
            model_name="relationship",
            name="instance",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="relationships", to="learning.courseinstance"),
        ),
    ]