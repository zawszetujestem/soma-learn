import secrets

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import Course, CourseVersion, Instance, InstancePeriod, InstanceTask


class DomainError(APIException):
    def __init__(self, code, detail, status_code=409):
        self.status_code = status_code
        super().__init__(detail={'code': code, 'detail': detail})


def forbidden(detail):
    return DomainError('forbidden', detail, status_code=403)


def not_found():
    return DomainError('not_found', 'Nie znaleziono.', status_code=404)


def conflict(code, detail):
    return DomainError(code, detail, status_code=409)


def visible_courses(user):
    has_instance = Instance.objects.filter(Q(student=user) | Q(mentor=user), course=OuterRef('pk'))
    courses = Course.objects.filter(current_published_version__isnull=False)
    if user.has_role('admin'):
        return courses
    return courses.annotate(has_instance=Exists(has_instance)).filter(
        Q(owner=user)
        | Q(visibility=Course.Visibility.PUBLIC, current_published_version__isnull=False, is_active=True)
        | Q(has_instance=True)
    )


def public_courses():
    return Course.objects.filter(
        visibility=Course.Visibility.PUBLIC,
        current_published_version__isnull=False,
        is_active=True,
    ).select_related(
        'current_published_version__scope', 'current_published_version__subject'
    ).prefetch_related('tasks', 'current_published_version__nodes')


def owned_courses(user):
    return Course.objects.filter(owner=user)


def get_owned_course(user, pk):
    course = owned_courses(user).filter(pk=pk).first()
    if course is None:
        raise not_found()
    return course


def get_readable_instance(user, pk):
    instance = readable_instances(user).filter(pk=pk).first()
    if instance is None:
        raise not_found()
    return instance


def readable_instances(user):
    return Instance.objects.filter(Q(student=user) | Q(mentor=user))


def _lock_instance(pk):
    return Instance.objects.select_for_update().get(pk=pk)


def _check_write_access(user, instance):
    if instance.mentor_id == user.pk:
        return
    if instance.student_id == user.pk:
        if instance.mentor_id is not None:
            raise forbidden('Instancję z mentorem zmienia mentor.')
        return
    raise not_found()


@transaction.atomic
def create_course(user, *, visibility, title='', description='', scope_id=None, subject_id=None):
    if not (user.has_role('mentor') or user.has_role('admin')):
        raise forbidden('Tworzenie kursów wymaga roli mentora lub administratora.')
    if user.has_role('admin') and visibility == Course.Visibility.PRIVATE:
        raise forbidden('Administrator tworzy wyłącznie kursy publiczne.')
    course = Course.objects.create(owner=user, title=title, description=description,
        visibility=visibility, approval_status=Course.ApprovalStatus.PENDING)
    version = CourseVersion.objects.create(course=course, number=1)
    from .content_services import update_metadata
    update_metadata(version, dict(title=title,description=description,scope_id=scope_id,subject_id=subject_id))
    return course


def update_course(course, data):
    for field, value in data.items():
        setattr(course, field, value)
    course.save()
    return course


def resubmit_course(course, user, if_match):
    version = course.versions.filter(state='rejected').first()
    if version is None:
        raise conflict('course_not_rejected', 'Ponowne zgłoszenie jest możliwe tylko dla wersji odrzuconej.')
    from .version_services import transition
    return transition(user, course.pk, version.pk, if_match, 'submit')


def regenerate_invite_token(course):
    if course.visibility != Course.Visibility.PRIVATE:
        raise conflict('course_not_private', 'Link zaproszenia dotyczy wyłącznie kursów prywatnych.')
    course.invite_token = secrets.token_urlsafe(32)
    course.save()
    return course


def join_course(user, *, course_id):
    course = Course.objects.filter(pk=course_id).first()
    return _join(user, course, via_token=False)


def join_by_token(user, token):
    course = Course.objects.filter(invite_token=token).first() if token else None
    return _join(user, course, via_token=True)


def _visible_to_non_student(course, *, via_token):
    if course.current_published_version_id is None or not course.is_active:
        return False
    return course.visibility == Course.Visibility.PUBLIC or via_token


def _join(user, course, *, via_token):
    is_owner = course is not None and course.owner_id == user.pk
    if course is None:
        raise not_found()
    if not (user.has_role('student') or is_owner):
        # Niewidoczny kurs nie może ujawniać swojego istnienia, więc 404 ma pierwszeństwo przed 403 dla roli.
        if not _visible_to_non_student(course, via_token=via_token):
            raise not_found()
        raise forbidden('Dołączyć do kursu mogą wyłącznie uczniowie.')

    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=user.pk)
        course = Course.objects.select_for_update().get(pk=course.pk)

        if not is_owner:
            if course.current_published_version_id is None:
                raise not_found()
            if course.visibility == Course.Visibility.PRIVATE and not via_token:
                raise not_found()
        elif course.current_published_version_id is None:
            raise conflict('course_not_approved', 'Brak opublikowanej wersji.')

        if not course.is_active:
            raise conflict('course_inactive', 'Kurs jest nieaktywny.')

        existing = Instance.objects.filter(
            course=course, student=user, status=Instance.Status.ACTIVE,
        ).first()
        if existing is not None:
            return existing, False

        if Instance.objects.filter(student=user, status=Instance.Status.ACTIVE).exists():
            raise conflict('slot_taken', 'Masz już aktywną instancję innego kursu.')

        try:
            with transaction.atomic():
                instance = Instance.objects.create(
                    course=course,
                    course_version_id=course.current_published_version_id,
                    student=user,
                    mentor=None if is_owner else course.owner,
                )
                InstanceTask.objects.bulk_create([
                    InstanceTask(
                        instance=instance,
                        title=task.title,
                        hours=task.hours,
                        position=task.position,
                    )
                    for task in course.tasks.all()
                ])
                InstancePeriod.objects.create(instance=instance)
        except IntegrityError:
            raise conflict('slot_taken', 'Masz już aktywną instancję innego kursu.')
    return instance, True


def close_instance(user, instance):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        if locked.status == Instance.Status.CLOSED:
            raise conflict('already_closed', 'Instancja jest już zamknięta.')
        now = timezone.now()
        locked.status = Instance.Status.CLOSED
        locked.closed_at = now
        locked.save(update_fields=['status', 'closed_at'])
        for period in locked.periods.filter(ended_at__isnull=True):
            period.ended_at = now
            period.save(update_fields=['ended_at'])
    return locked


def resume_instance(user, instance):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        if locked.status == Instance.Status.ACTIVE:
            raise conflict('already_active', 'Instancja jest już aktywna.')
        course = Course.objects.select_for_update().get(pk=locked.course_id)
        if course.current_published_version_id is None:
            raise conflict('course_not_approved', 'Brak opublikowanej wersji.')
        if not course.is_active:
            raise conflict('course_inactive', 'Kurs jest nieaktywny.')
        if Instance.objects.filter(student_id=locked.student_id, status=Instance.Status.ACTIVE).exclude(
            pk=locked.pk,
        ).exists():
            raise conflict('slot_taken', 'Masz już aktywną instancję innego kursu.')

        now = timezone.now()
        locked.status = Instance.Status.ACTIVE
        locked.closed_at = None
        try:
            with transaction.atomic():
                locked.save(update_fields=['status', 'closed_at'])
        except IntegrityError:
            raise conflict('slot_taken', 'Masz już aktywną instancję innego kursu.')
        InstancePeriod.objects.create(instance=locked, started_at=now)
    return locked


def change_instance_task_status(user, instance, task, new_status):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        if locked.status == Instance.Status.CLOSED:
            raise conflict('instance_closed', 'Zamknięta instancja jest tylko do odczytu.')
        task = InstanceTask.objects.filter(pk=task.pk, instance=locked).first()
        if task is None:
            raise not_found()
        task.status = new_status
        task.save(update_fields=['status'])
    return task


def count_active_students(course, mentor):
    return Instance.objects.filter(
        course=course, mentor=mentor, status=Instance.Status.ACTIVE,
    ).count()
