from django.core.management import call_command
from django.db import migrations


def create_rate_limit_cache_table(apps, schema_editor):
    call_command(
        'createcachetable',
        verbosity=0,
        database=schema_editor.connection.alias,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_backfill_allauth_emails'),
    ]

    operations = [
        migrations.RunPython(
            create_rate_limit_cache_table,
            migrations.RunPython.noop,
        ),
    ]