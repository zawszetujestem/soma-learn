import secrets

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import Course, CourseTask, CourseVersion, Instance, InstancePeriod, InstanceTask, InstanceCycle, InstanceCycleTask


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


def author_courses(user):
    """Read-only mine access is independent of mutation competence."""
    if user.has_role('admin'):
        return Course.objects.filter(Q(visibility=Course.Visibility.PUBLIC) | Q(owner=user))
    if user.has_role('mentor'):
        return Course.objects.filter(owner=user)
    return Course.objects.none()


def get_author_course(user, pk):
    course = author_courses(user).filter(pk=pk).first()
    if course is None:
        raise not_found()
    return course


def owned_courses(user):
    if user.has_role('admin'):
        # Keep identity/plan access to private courses owner-only.
        return Course.objects.filter(Q(visibility=Course.Visibility.PUBLIC) | Q(owner=user))
    if not user.has_role('mentor'):
        return Course.objects.none()
    published = CourseVersion.objects.filter(course=OuterRef('pk'), state='published')
    return Course.objects.filter(owner=user).annotate(ever_published=Exists(published)).filter(
        Q(visibility=Course.Visibility.PRIVATE) | Q(ever_published=False)
    )


def get_owned_course(user, pk):
    course = owned_courses(user).filter(pk=pk).first()
    if course is None:
        raise not_found()
    return course


def lock_owned_course(user, pk):
    # Lock identity BEFORE evaluating publication history. All publication,
    # content, plan, deletion and join writers use the same course lock.
    course = Course.objects.select_for_update().filter(pk=pk).first()
    if course is None or not owned_courses(user).filter(pk=pk).exists():
        raise not_found()
    return course


@transaction.atomic
def delete_course(user, pk):
    course = lock_owned_course(user, pk)
    if course.instances.exists():  # Includes CLOSED historical instances.
        course.is_active = False
        course.save(update_fields=['is_active', 'updated_at'])
        return course

    from .asset_services import delete_course_files
    from .models import NodePrerequisite
    files = [(asset.file.storage, asset.file.name) for asset in course.assets.all()]
    # Explicit order resolves PROTECT without weakening global FK safety.
    course.current_published_version = None
    course.save(update_fields=['current_published_version', 'updated_at'])
    NodePrerequisite.objects.filter(target__version__course=course).delete()
    course.versions.all().delete()
    course.assets.all().delete()
    course.delete()
    # Never remove physical files before a successful commit. The existing
    # untracked-file cleanup handles a crash or failed storage deletion.
    transaction.on_commit(lambda: delete_course_files(files))
    return None


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


@transaction.atomic
def update_course(course, data, *, user):
    course = lock_owned_course(user, course.pk)
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


@transaction.atomic
def regenerate_invite_token(course, *, user):
    course = lock_owned_course(user, course.pk)
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
        course = Course.objects.select_for_update().filter(pk=course.pk).first()
        if course is None:
            raise not_found()

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

        try:
            with transaction.atomic():
                instance = Instance.objects.create(
                    course=course,
                    course_version_id=course.current_published_version_id,
                    student=user,
                    mentor=None if is_owner else course.owner,
                )
                plan = list(course.tasks.prefetch_related('prerequisites').all())
                copies = {}
                for task in plan:
                    copies[task.pk] = InstanceTask.objects.create(
                        instance=instance,
                        title=task.title,
                        hours=task.hours,
                        position=task.position,
                    )
                for task in plan:
                    copies[task.pk].prerequisites.set(copies[p.pk] for p in task.prerequisites.all())
                InstancePeriod.objects.create(instance=instance)
        except IntegrityError:
            raise conflict('slot_taken', 'Masz już aktywną instancję tego kursu.')
    return instance, True


def close_instance(user, instance):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        if locked.status == Instance.Status.CLOSED:
            raise conflict('already_closed', 'Instancja jest już zamknięta.')
        now = timezone.now()
        cycle = locked.cycles.filter(ended_at__isnull=True).first()
        if cycle:
            _end_cycle(cycle, now)
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
        if Instance.objects.filter(student_id=locked.student_id, course_id=locked.course_id,
                                   status=Instance.Status.ACTIVE).exclude(
            pk=locked.pk,
        ).exists():
            raise conflict('slot_taken', 'Masz już aktywną instancję tego kursu.')

        now = timezone.now()
        locked.status = Instance.Status.ACTIVE
        locked.closed_at = None
        try:
            with transaction.atomic():
                locked.save(update_fields=['status', 'closed_at'])
        except IntegrityError:
            raise conflict('slot_taken', 'Masz już aktywną instancję tego kursu.')
        InstancePeriod.objects.create(instance=locked, started_at=now)
    return locked


def change_instance_task_status(user, instance, task, new_status):
    return change_instance_task(user, instance, task, status=new_status)


def validate_task_prerequisites(course_id, task_id, ids):
    """Called under the course lock by authoring views; validate the explicit DAG."""
    tasks = list(CourseTask.objects.filter(course_id=course_id).prefetch_related('prerequisites'))
    graph = {task.pk: [p.pk for p in task.prerequisites.all()] for task in tasks}
    invalid = (task_id in ids or any(pk not in graph for pk in ids))
    if not invalid and task_id is not None:
        pending, visited = list(ids), set()
        while pending:
            pk = pending.pop()
            if pk == task_id:
                invalid = True
                break
            if pk not in visited:
                visited.add(pk)
                pending.extend(graph[pk])
    if invalid:
        raise DomainError('invalid_prerequisite',
                          'Wymagania muszą należeć do tego kursu i nie mogą tworzyć cyklu ani wskazywać samego zadania.',
                          status_code=400)


def task_blocked(task, target_status=None):
    status = task.status if target_status is None else target_status
    return status != InstanceTask.Status.DONE and any(
        p.status != InstanceTask.Status.DONE for p in task.prerequisites.all()
    )


def _end_cycle(cycle, now):
    for entry in cycle.entries.filter(removed_at__isnull=True).select_related('task'):
        entry.status = entry.task.status
        entry.save(update_fields=['status'])
    cycle.ended_at = now
    cycle.save(update_fields=['ended_at'])


def start_cycle(user, instance):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        if locked.status != Instance.Status.ACTIVE:
            raise conflict('instance_closed', 'Zamknięta instancja jest tylko do odczytu.')
        if locked.cycles.filter(ended_at__isnull=True).exists():
            raise conflict('cycle_already_active', 'Ta instancja ma już aktywny cykl.')
        InstanceCycle.objects.create(instance=locked)
    return locked


def close_cycle(user, instance, cycle_id):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        cycle = locked.cycles.filter(pk=cycle_id).first()
        if cycle is None:
            raise not_found()
        if cycle.ended_at is not None:
            raise conflict('cycle_not_active', 'Ten cykl jest już zakończony.')
        _end_cycle(cycle, timezone.now())
    return locked


def change_instance_task(user, instance, task, **changes):
    with transaction.atomic():
        locked = _lock_instance(instance.pk)
        _check_write_access(user, locked)
        if locked.status == Instance.Status.CLOSED:
            raise conflict('instance_closed', 'Zamknięta instancja jest tylko do odczytu.')
        task = InstanceTask.objects.filter(pk=task.pk, instance=locked).first()
        if task is None:
            raise not_found()
        new_status = changes.get('status', task.status)
        # Gating cannot be bypassed by marking an unavailable task Done.
        unsatisfied = any(p.status != InstanceTask.Status.DONE for p in task.prerequisites.all())
        if 'status' in changes and unsatisfied and new_status != 'todo':
            raise conflict('task_blocked', 'Najpierw ukończ wszystkie wymagane zadania.')
        cycle = locked.cycles.filter(ended_at__isnull=True).first()
        if changes.get('selected') is True:
            if cycle is None:
                raise conflict('no_active_cycle', 'Najpierw rozpocznij cykl.')
            if task_blocked(task, new_status):
                raise conflict('task_blocked', 'Najpierw ukończ wszystkie wymagane zadania.')
        task.status = new_status
        task.save(update_fields=['status'])
        if cycle:
            entry = cycle.entries.filter(task=task).first()
            if changes.get('selected') is True:
                entry, _ = InstanceCycleTask.objects.update_or_create(
                    cycle=cycle, task=task, defaults={'status': task.status, 'removed_at': None},
                )
            elif entry and entry.removed_at is None:
                entry.status = task.status
                if changes.get('selected') is False:
                    entry.removed_at = timezone.now()
                entry.save(update_fields=['status', 'removed_at'])
            # Recompute availability for selected unfinished tasks after every status change.
            for selected in cycle.entries.filter(removed_at__isnull=True).select_related('task').prefetch_related('task__prerequisites'):
                if task_blocked(selected.task):
                    selected.status = selected.task.status
                    selected.removed_at = timezone.now()
                    selected.save(update_fields=['status', 'removed_at'])
    return task


def count_active_students(course, mentor):
    return Instance.objects.filter(
        course=course, mentor=mentor, status=Instance.Status.ACTIVE,
    ).count()
