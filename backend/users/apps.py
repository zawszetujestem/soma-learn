import os

from django.apps import AppConfig
from django.db.models.signals import post_migrate


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        from .models import Role, User

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

        post_migrate.connect(create_superuser, sender=self)
