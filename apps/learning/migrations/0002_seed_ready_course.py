from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor

READY_COURSE_TITLE = "Matematyka — klasa 8"


def seed_ready_course(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Course = apps.get_model("learning", "Course")
    Course.objects.get_or_create(title=READY_COURSE_TITLE, defaults={})


def unseed_ready_course(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    return


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_ready_course, unseed_ready_course),
    ]
