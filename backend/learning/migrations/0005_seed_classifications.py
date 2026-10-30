from django.db import migrations

SCOPES = ('Szkoła podstawowa', 'Szkoła średnia')

# Subjects available on the egzamin ósmoklasisty or matura; PE, music, art and technology are intentionally omitted.
SUBJECTS = (
    'Język polski',
    'Matematyka',
    'Język angielski',
    'Język niemiecki',
    'Język francuski',
    'Język hiszpański',
    'Język rosyjski',
    'Język włoski',
    'Historia',
    'Wiedza o społeczeństwie',
    'Geografia',
    'Biologia',
    'Chemia',
    'Fizyka',
    'Informatyka',
    'Filozofia',
    'Język łaciński i kultura antyczna',
)


def seed_classifications(apps, schema_editor):
    for model_name, names in (('CourseScope', SCOPES), ('CourseSubject', SUBJECTS)):
        model = apps.get_model('learning', model_name)
        existing = set(model.objects.filter(name__in=names).values_list('name', flat=True))
        model.objects.bulk_create(model(name=name) for name in names if name not in existing)


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0004_require_instance_version'),
    ]

    # Reverse is a no-op: entries may already be referenced by courses (PROTECT).
    operations = [
        migrations.RunPython(seed_classifications, migrations.RunPython.noop),
    ]
