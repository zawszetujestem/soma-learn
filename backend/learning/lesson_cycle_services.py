from django.db import transaction

from . import services
from .lesson_cycle_serializers import LessonCycleProjectionSerializer, validate_date_range
from .models import CourseNode, Instance, InstanceLessonCycle, InstanceLessonCycleLesson


def projection(instance):
    data = {'active_cycle': None, 'planned_cycle': None, 'history': []}
    for cycle in instance.lesson_cycles.prefetch_related('entries'):
        if cycle.status == InstanceLessonCycle.Status.ENDED:
            data['history'].append(cycle)
        else:
            data[f'{cycle.status}_cycle'] = cycle
    return LessonCycleProjectionSerializer(data).data


def lock_writable_instance(user, pk):
    # Shared Instance lock serializes selection/lifecycle with legacy instance
    # close/resume. Permission and closed-state checks happen AFTER the lock.
    instance = services.readable_instances(user).select_for_update().filter(pk=pk).first()
    if instance is None:
        raise services.not_found()
    if instance.status == Instance.Status.CLOSED:
        raise services.conflict('instance_closed', 'Zamknięta instancja jest tylko do odczytu.')
    return instance


def get_cycle(instance, cycle_id):
    cycle = instance.lesson_cycles.filter(pk=cycle_id).first()
    if cycle is None:
        raise services.not_found()
    return cycle


def require_planned(cycle):
    if cycle.status != InstanceLessonCycle.Status.PLANNED:
        raise services.conflict('lesson_cycle_not_planned', 'Cykl nie jest planowany.')


@transaction.atomic
def create(user, instance_id, *, start_date, end_date):
    instance = lock_writable_instance(user, instance_id)
    if instance.lesson_cycles.filter(status='planned').exists():
        raise services.conflict('planned_lesson_cycle_exists', 'Istnieje już planowany cykl lekcji.')
    InstanceLessonCycle.objects.create(
        instance=instance, start_date=start_date, end_date=end_date,
    )
    return projection(instance)


@transaction.atomic
def update(user, instance_id, cycle_id, **dates):
    instance = lock_writable_instance(user, instance_id)
    cycle = get_cycle(instance, cycle_id)
    require_planned(cycle)
    # Validate the resulting range under the lock: concurrent partial PATCHes
    # must combine with current, not previously fetched, values.
    validate_date_range(
        dates.get('start_date', cycle.start_date), dates.get('end_date', cycle.end_date),
    )
    for field, value in dates.items():
        setattr(cycle, field, value)
    if dates:
        cycle.save(update_fields=list(dates))
    return projection(instance)


@transaction.atomic
def start(user, instance_id, cycle_id):
    instance = lock_writable_instance(user, instance_id)
    cycle = get_cycle(instance, cycle_id)
    require_planned(cycle)
    if instance.lesson_cycles.filter(status='active').exists():
        raise services.conflict('active_lesson_cycle_exists', 'Istnieje już aktywny cykl lekcji.')
    cycle.status = InstanceLessonCycle.Status.ACTIVE
    cycle.save(update_fields=['status'])
    return projection(instance)


@transaction.atomic
def close(user, instance_id, cycle_id):
    instance = lock_writable_instance(user, instance_id)
    cycle = get_cycle(instance, cycle_id)
    if cycle.status != InstanceLessonCycle.Status.ACTIVE:
        raise services.conflict('lesson_cycle_not_active', 'Cykl nie jest aktywny.')
    cycle.status = InstanceLessonCycle.Status.ENDED
    cycle.save(update_fields=['status'])
    return projection(instance)


@transaction.atomic
def add_lesson(user, instance_id, cycle_id, *, lesson_id):
    instance = lock_writable_instance(user, instance_id)
    cycle = get_cycle(instance, cycle_id)
    require_planned(cycle)
    lesson = CourseNode.objects.filter(
        pk=lesson_id, version_id=instance.course_version_id, kind='lesson',
    ).first()
    if lesson is None:
        raise services.DomainError('invalid_lesson', 'Lekcja nie należy do wersji instancji.', 400)
    if cycle.entries.filter(lesson=lesson).exists():
        raise services.conflict('lesson_already_selected', 'Lekcja jest już wybrana.')
    InstanceLessonCycleLesson.objects.create(cycle=cycle, lesson=lesson)
    return projection(instance)


@transaction.atomic
def remove_lesson(user, instance_id, cycle_id, lesson_id):
    instance = lock_writable_instance(user, instance_id)
    cycle = get_cycle(instance, cycle_id)
    require_planned(cycle)
    entry = cycle.entries.filter(lesson_id=lesson_id).first()
    if entry is None:
        raise services.not_found()
    entry.delete()
    return projection(instance)
