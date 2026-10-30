import os

from django.apps import AppConfig
from django.db.models.signals import post_migrate


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        from allauth.account.models import EmailAddress
        from allauth.account.signals import email_confirmed
        from .models import Role, User

        def sync_confirmed_email(sender, request, email_address, **kwargs):
            User.objects.filter(pk=email_address.user_id, email__iexact=email_address.email).update(
                is_email_confirmed=True,
            )

        email_confirmed.connect(sync_confirmed_email, weak=False, dispatch_uid='users.sync_confirmed_email')

        def create_superuser(sender, **kwargs):
            email = os.getenv('SUPERUSER_EMAIL', 'admin@soma-learn.local')
            password = os.getenv('SUPERUSER_PASSWORD', 'admin123')
            first_name = os.getenv('SUPERUSER_FIRST_NAME', 'Admin')
            last_name = os.getenv('SUPERUSER_LAST_NAME', 'Soma')

            if not User.objects.filter(email=email).exists():
                user = User.objects.create_superuser(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                )
                admin_role, _ = Role.objects.get_or_create(name=Role.ADMIN)
                user.roles.add(admin_role)
                user.is_email_confirmed = True
                user.save()
                print(f'Superuser "{email}" created successfully.')

            user = User.objects.get(email=email)
            if user.is_superuser and user.is_email_confirmed:
                EmailAddress.objects.update_or_create(
                    user=user, email=user.email,
                    defaults={'primary': True, 'verified': True},
                )

        post_migrate.connect(create_superuser, sender=self, weak=False)
