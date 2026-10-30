from django.contrib.auth import get_user_model

from learning.models import Course, CourseVersion
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
                active=True, title='Kurs testowy', description='Opis', legacy=True):
    course = Course(
        owner=owner,
        title=title,
        description=description,
        visibility=visibility,
        approval_status=status,
        is_active=active,
    )
    course.save()
    if legacy:
        state = {'approved':'published','pending':'submitted','rejected':'rejected'}[status]
        version = CourseVersion.objects.create(course=course,number=1,state=state,
            title=title,description=description,legacy_import=True)
        if state == 'published':
            course.current_published_version=version
            course.save(update_fields=['current_published_version'])
    return course


def complete_version(version):
    from learning.models import CourseScope, CourseSubject, CourseNode, LessonItem
    version.scope=CourseScope.objects.create(name='Scope')
    version.subject=CourseSubject.objects.create(name='Subject')
    version.save()
    section=CourseNode.objects.create(version=version,kind='section',title='S',position=1)
    topic=CourseNode.objects.create(version=version,kind='topic',title='T',parent=section,position=1)
    lesson=CourseNode.objects.create(version=version,kind='lesson',title='L',parent=topic,position=1)
    LessonItem.objects.create(lesson=lesson,category='theory',format='markdown',text='Content',position=1)
    return version
