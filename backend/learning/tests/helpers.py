from django.contrib.auth import get_user_model

from learning.models import Course
from users.models import Role

PASSWORD = 'Long-Unique-Password-482!'


def make_user(email, *roles):
    user = get_user_model().objects.create_user(
        email=email,
        password=PASSWORD,
        first_name='Test',
        last_name='User',
        is_email_confirmed=True,
    )
    for name in roles:
        role, _ = Role.objects.get_or_create(name=name)
        user.roles.add(role)
    return user


def make_course(owner, *, visibility=Course.Visibility.PUBLIC, status=Course.ApprovalStatus.APPROVED,
                active=True, title='Kurs testowy', description='Opis'):
    course = Course(
        owner=owner,
        title=title,
        description=description,
        visibility=visibility,
        approval_status=status,
        is_active=active,
    )
    course.save()
    return course
