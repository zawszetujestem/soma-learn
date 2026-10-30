from django.db import migrations


def backfill(apps, schema_editor):
    Course = apps.get_model('learning', 'Course')
    CourseVersion = apps.get_model('learning', 'CourseVersion')
    Instance = apps.get_model('learning', 'Instance')
    alias = schema_editor.connection.alias
    states = {'approved': 'published', 'pending': 'submitted', 'rejected': 'rejected'}
    for course in Course.objects.using(alias).all().iterator():
        version = CourseVersion.objects.using(alias).create(
            course_id=course.pk, number=1, state=states[course.approval_status],
            title=course.title, description=course.description, legacy_import=True,
        )
        if course.approval_status == 'approved':
            Course.objects.using(alias).filter(pk=course.pk).update(current_published_version_id=version.pk)
        Instance.objects.using(alias).filter(course_id=course.pk).update(course_version_id=version.pk)


class Migration(migrations.Migration):
    dependencies = [('learning', '0002_course_versions_schema')]
    # Legacy rows are untouched. Reversing the schema discards version data;
    # a production rollback after new writes must restore a DB backup instead.
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
