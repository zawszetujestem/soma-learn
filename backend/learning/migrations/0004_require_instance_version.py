import django.db.models.deletion
from django.db import migrations, models


def check_pinning(apps, schema_editor):
    Instance = apps.get_model('learning', 'Instance')
    alias = schema_editor.connection.alias
    if Instance.objects.using(alias).filter(course_version__isnull=True).exists():
        raise RuntimeError('Course version backfill is incomplete.')
    if Instance.objects.using(alias).exclude(course_id=models.F('course_version__course_id')).exists():
        raise RuntimeError('Instance version belongs to a different course.')


class Migration(migrations.Migration):
    dependencies = [('learning', '0003_backfill_course_versions')]
    operations = [
        migrations.RunPython(check_pinning, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='instance', name='course_version',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='instances', to='learning.courseversion'),
        ),
    ]
