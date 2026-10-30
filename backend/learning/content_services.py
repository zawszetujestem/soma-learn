"""Draft editing. All writers lock course, then version, in that order."""

from contextlib import contextmanager

from django.db import transaction
from django.db.models import Max

from . import content_serializers as output
from .models import (
    Course,
    CourseAsset,
    CourseNode,
    CourseScope,
    CourseSubject,
    CourseVersion,
    LessonItem,
    NodePrerequisite,
    NodeTest,
    TestOption,
    TestQuestion,
)
from .services import conflict, not_found
from .validators import dependency_conflicts, invalid, validate_material


def can_manage(user, course):
    return user.has_role('admin') or (
        course.owner_id == user.pk and user.has_role('mentor')
    )


def get_course(user, course_id):
    course = Course.objects.filter(pk=course_id).first()
    if course is None or not can_manage(user, course):
        raise not_found()
    return course


def get_version(user, course_id, version_id):
    course = get_course(user, course_id)
    version = (
        CourseVersion.objects.select_related('course', 'scope', 'subject')
        .filter(pk=version_id, course=course)
        .first()
    )
    if version is None:
        raise not_found()
    return version


def etag(version):
    return f'"v{version.pk}-r{version.revision}"'


@contextmanager
def edit_version(user, course_id, version_id, if_match):
    get_version(
        user, course_id, version_id
    )  # Access precedes state/revision disclosure.
    with transaction.atomic():
        course = Course.objects.select_for_update().get(pk=course_id)
        if not can_manage(user, course):
            raise not_found()
        version = CourseVersion.objects.select_for_update().get(
            pk=version_id, course=course
        )
        version.course = course
        if version.state not in ('draft', 'rejected'):
            raise conflict('invalid_version_state', 'Ta wersja nie jest edytowalna.')
        if not if_match:
            raise invalid('revision_required', 'Wymagany jest nagłówek If-Match.')
        if if_match != etag(version):
            raise conflict('stale_revision', 'Wersja została zmieniona. Odśwież dane.')
        yield version


def bump_revision(version):
    version.revision += 1
    version.save(update_fields=['revision', 'updated_at'])


def parse(serializer_class, data, **kwargs):
    serializer = serializer_class(data=data, **kwargs)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def get_node(version, pk, *, lesson=False):
    node = version.nodes.filter(pk=pk).first()
    if node is None or (lesson and node.kind != 'lesson'):
        raise not_found()
    return node


def next_position(queryset):
    return (queryset.aggregate(maximum=Max('position'))['maximum'] or 0) + 1


def prerequisite_conflict(dependencies):
    error = conflict('prerequisite_conflict', 'Operacja narusza wymaganie wstępne.')
    error.detail['dependencies'] = dependencies
    return error


def update_metadata(version, data):
    values = parse(output.VersionPatchSerializer, data)
    for field, model in (('scope_id', CourseScope), ('subject_id', CourseSubject)):
        if (
            field in values
            and values[field] is not None
            and not model.objects.filter(pk=values[field], is_active=True).exists()
        ):
            raise invalid(
                'classification_invalid', 'Wybierz aktywną pozycję klasyfikacji.'
            )
    for field, value in values.items():
        setattr(version, field, value)
    version.save()


def create_node(version, data):
    values = parse(output.NodeCreateSerializer, data)
    parent_id = values.pop('parent_id', None)
    parent = version.nodes.filter(pk=parent_id).first() if parent_id else None
    kind = values['kind']
    expected = {'topic': 'section', 'lesson': 'topic'}
    if (kind == 'section' and parent_id is not None) or (
        kind != 'section' and (parent is None or parent.kind != expected[kind])
    ):
        raise invalid('invalid_parent', 'Nieprawidłowy rodzic elementu.')
    return CourseNode.objects.create(
        version=version,
        parent=parent,
        position=next_position(version.nodes.filter(parent=parent)),
        **values,
    )


def patch_node(node, data):
    if 'parent_id' in data or 'parent' in data:
        raise invalid(
            'parent_immutable', 'Rodzica istniejącego elementu nie można zmienić.'
        )
    values = parse(output.NodePatchSerializer, data)
    for field, value in values.items():
        setattr(node, field, value)
    node.save()
    return node


def delete_node(version, node):
    nodes = list(version.nodes.all())
    subtree = {node.pk}
    for _ in range(3):
        subtree.update(n.pk for n in nodes if n.parent_id in subtree)
    external = list(
        NodePrerequisite.objects.filter(source_id__in=subtree)
        .exclude(target_id__in=subtree)
        .values('target_id', 'source_id')
    )
    if external:
        raise prerequisite_conflict(external)
    # PROTECT is immediate in Django's collector: remove internal edges first.
    NodePrerequisite.objects.filter(target_id__in=subtree).delete()
    node.delete()


def move(queryset, obj, direction, *, version=None):
    siblings = list(queryset.order_by('position', 'id'))
    index = next(i for i, n in enumerate(siblings) if n.pk == obj.pk)
    other_index = index + (-1 if direction == 'up' else 1)
    if other_index < 0 or other_index >= len(siblings):
        return {
            'moved': False,
            'siblings': [{'id': n.pk, 'position': n.position} for n in siblings],
        }
    other = siblings[other_index]
    old_position, new_position = obj.position, other.position
    if version is not None:
        nodes = list(version.nodes.all())
        for node in nodes:
            if node.pk == obj.pk:
                node.position = new_position
            elif node.pk == other.pk:
                node.position = old_position
        dependencies = NodePrerequisite.objects.filter(target__version=version)
        conflicts = dependency_conflicts(nodes, dependencies)
        if conflicts:
            raise prerequisite_conflict(conflicts)
    # Temporary positive unused slot avoids immediate uniqueness conflicts.
    queryset.filter(pk=obj.pk).update(position=next_position(queryset))
    queryset.filter(pk=other.pk).update(position=old_position)
    queryset.filter(pk=obj.pk).update(position=new_position)
    return {
        'moved': True,
        'siblings': list(queryset.order_by('position', 'id').values('id', 'position')),
    }


def put_prerequisite(version, node, data):
    if not isinstance(data, dict) or set(data) != {'source_id', 'threshold'}:
        raise invalid('invalid_prerequisite', 'Podaj źródło i próg wymagania.')
    source_id, threshold = data['source_id'], data['threshold']
    if (
        type(threshold) is not int
        or not 1 <= threshold <= 100
        or type(source_id) is not int
    ):
        raise invalid(
            'invalid_prerequisite', 'Próg musi być całkowitą liczbą od 1 do 100.'
        )
    source = version.nodes.filter(pk=source_id).first()
    candidate = NodePrerequisite(target=node, source=source, threshold=threshold)
    if (
        source is None
        or not NodeTest.objects.filter(node=source).exists()
        or dependency_conflicts(list(version.nodes.all()), [candidate])
    ):
        raise invalid(
            'invalid_prerequisite',
            'Źródło musi być wcześniejszym niezależnym elementem z testem tej samej wersji.',
        )
    obj, _ = NodePrerequisite.objects.update_or_create(
        target=node, defaults={'source': source, 'threshold': threshold}
    )
    return obj


def save_item(version, lesson, data, item=None):
    values = parse(output.ItemSerializer, data)
    if (
        item is not None
        and 'category' in values
        and values['category'] != item.category
    ):
        raise invalid('invalid_material', 'Kategoria materiału jest niezmienna.')
    if item is None:
        if not all(field in values for field in ('category', 'format')):
            raise invalid('invalid_material', 'Podaj kategorię i format materiału.')
        item = LessonItem(
            lesson=lesson,
            position=next_position(lesson.items.filter(category=values['category'])),
        )
    if (item.category == 'theory' or values.get('category') == 'theory') and (
        'answer_mode' in values or 'answer_text' in values
    ):
        raise invalid('invalid_material', 'Teoria nie ma klucza odpowiedzi.')
    if 'asset_id' in values:
        asset_id = values.pop('asset_id')
        asset = (
            CourseAsset.objects.filter(
                pk=asset_id, course=version.course, state='ready'
            ).first()
            if asset_id
            else None
        )
        if asset_id and asset is None:
            raise not_found()
        item.asset = asset
    for field, value in values.items():
        setattr(item, field, value)
    validate_material(item)
    count = lesson.items.exclude(pk=item.pk).filter(asset__isnull=False).count()
    if count + bool(item.asset_id) > 20:
        raise conflict(
            'attachment_limit_exceeded',
            'Lekcja może mieć najwyżej 20 wystąpień załączników.',
        )
    item.save()
    return item


def replace_test(node, data, *, create=False):
    existing = NodeTest.objects.filter(node=node).first()
    if create and existing:
        raise conflict('test_exists', 'Ten element ma już test.')
    if not create and existing is None:
        raise not_found()
    if create and isinstance(data, dict) and 'questions' not in data:
        data = dict(data, questions=[])
    values = parse(output.TestInput, data)
    test = existing or NodeTest.objects.create(node=node)
    test.questions.all().delete()
    for i, question in enumerate(values['questions'], 1):
        options = question.pop('options')
        saved = TestQuestion.objects.create(test=test, position=i, **question)
        TestOption.objects.bulk_create(
            [
                TestOption(question=saved, position=j, **option)
                for j, option in enumerate(options, 1)
            ]
        )
    return test


def delete_test(node):
    deps = list(node.prerequisite_dependents.values('source_id', 'target_id'))
    if deps:
        raise prerequisite_conflict(deps)
    test = NodeTest.objects.filter(node=node).first()
    if test is None:
        raise not_found()
    test.delete()
