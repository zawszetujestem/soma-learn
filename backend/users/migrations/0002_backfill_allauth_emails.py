from collections import defaultdict

from django.db import migrations


def backfill_email_addresses(apps, schema_editor):
    User = apps.get_model('users', 'User')
    EmailAddress = apps.get_model('account', 'EmailAddress')
    database = schema_editor.connection.alias
    users = list(User.objects.using(database).all())

    normalized_emails = defaultdict(list)
    for user in users:
        normalized_emails[user.email.strip().casefold()].append(user.pk)

    conflicts = [email for email, user_ids in normalized_emails.items() if len(user_ids) > 1]
    if conflicts:
        raise RuntimeError(
            'Resolve case-insensitive duplicate user emails before enabling allauth: '
            + ', '.join(conflicts)
        )

    for user in users:
        email = user.email.strip().lower()
        User.objects.using(database).filter(pk=user.pk).update(email=email)
        EmailAddress.objects.using(database).filter(
            user_id=user.pk,
            primary=True,
        ).exclude(email=email).update(primary=False)
        EmailAddress.objects.using(database).update_or_create(
            user_id=user.pk,
            email=email,
            defaults={
                'primary': True,
                'verified': user.is_email_confirmed,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ('account', '0009_emailaddress_unique_primary_email'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_email_addresses, migrations.RunPython.noop),
    ]