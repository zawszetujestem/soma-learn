"""Content invariants shared by draft editing and publication validation."""

from urllib.parse import urlsplit

from .models import NodePrerequisite
from .services import DomainError

VIDEO_HOSTS = {
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'vimeo.com',
    'www.vimeo.com',
}


def invalid(code, message):
    return DomainError(code, message, status_code=400)


def validate_video_url(value):
    try:
        url = urlsplit(value)
        valid = (
            url.scheme == 'https'
            and url.hostname in VIDEO_HOSTS
            and url.username is None
            and url.password is None
            and url.port in (None, 443)
            and not any(c.isspace() or ord(c) < 32 for c in value)
            and '\\' not in value
        )
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise invalid(
            'invalid_video_url', 'Podaj bezpieczny link HTTPS do YouTube lub Vimeo.'
        )


def preorder(nodes):
    by_parent = {}
    for node in nodes:
        by_parent.setdefault(node.parent_id, []).append(node)
    for siblings in by_parent.values():
        siblings.sort(key=lambda n: (n.position, n.pk))
    result = []

    def walk(parent):
        for node in by_parent.get(parent, []):
            result.append(node.pk)
            walk(node.pk)

    walk(None)
    return result


def is_ancestor(source, target, by_id):
    parent = target.parent_id
    while parent is not None:
        if parent == source.pk:
            return True
        parent = by_id[parent].parent_id
    return False


def dependency_conflicts(nodes, dependencies):
    order = {pk: i for i, pk in enumerate(preorder(nodes))}
    by_id = {node.pk: node for node in nodes}
    conflicts = []
    for dep in dependencies:
        source, target = by_id.get(dep.source_id), by_id.get(dep.target_id)
        if (
            source is None
            or target is None
            or order.get(source.pk, -1) >= order.get(target.pk, -1)
            or is_ancestor(source, target, by_id)
            or is_ancestor(target, source, by_id)
        ):
            conflicts.append({'source_id': dep.source_id, 'target_id': dep.target_id})
    return conflicts


def validate_material(item):
    formats = {
        'theory': {'markdown', 'pdf', 'image', 'video'},
        'practice': {'text', 'text_image', 'pdf', 'image'},
    }
    bad = item.format not in formats.get(item.category, set())
    text_needed = item.format in ('markdown', 'text', 'text_image')
    file_needed = item.format in ('pdf', 'image', 'text_image')
    image_needed = item.format in ('image', 'text_image')
    bad |= text_needed and not item.text.strip()
    bad |= not text_needed and bool(item.text)
    bad |= file_needed != bool(item.asset_id)
    bad |= image_needed and not item.image_alt.strip()
    bad |= not image_needed and bool(item.image_alt)
    bad |= item.format != 'video' and bool(item.video_url)
    if file_needed and item.asset_id:
        allowed = (
            {'application/pdf'}
            if item.format == 'pdf'
            else {'image/png', 'image/jpeg', 'image/webp'}
        )
        bad |= item.asset.media_type not in allowed or item.asset.state != 'ready'
        bad |= item.asset.course_id != item.lesson.version.course_id
    if item.answer_mode == 'open':
        item.answer_text = None
    else:
        bad |= (
            item.answer_mode != 'keyed'
            or item.category != 'practice'
            or not (item.answer_text or '').strip()
        )
    if bad:
        raise invalid(
            'invalid_material', 'Nieprawidłowa definicja materiału lub zadania.'
        )
    if item.format == 'video':
        validate_video_url(item.video_url)


def test_issues(test, path):
    issues = []

    def add(where, message):
        issues.append({'path': where, 'code': 'version_incomplete', 'message': message})

    questions = list(test.questions.all())
    if not questions:
        add(path + '.questions', 'Test wymaga co najmniej jednego pytania.')
    for i, question in enumerate(questions):
        qpath = f'{path}.questions.{i}'
        if not question.text.strip():
            add(qpath + '.text', 'Pytanie wymaga treści.')
        options = list(question.options.all())
        if len(options) < 2:
            add(qpath + '.options', 'Pytanie wymaga co najmniej dwóch opcji.')
        for j, option in enumerate(options):
            if not option.text.strip():
                add(f'{qpath}.options.{j}.text', 'Opcja wymaga treści.')
        correct = sum(option.is_correct for option in options)
        if (
            question.type not in ('single', 'multiple')
            or correct < 1
            or (question.type == 'single' and correct != 1)
        ):
            add(qpath + '.options', 'Nieprawidłowa liczba poprawnych odpowiedzi.')
    return issues


def validate_version_for_publication(version):
    issues = []

    def add(path, message, code='version_incomplete'):
        issues.append({'path': path, 'code': code, 'message': message})

    if not version.title.strip():
        add('title', 'Kurs wymaga tytułu.')
    for field in ('scope', 'subject'):
        value = getattr(version, field)
        if value is None or not value.is_active:
            add(
                field, 'Wybierz aktywną pozycję klasyfikacji.', 'classification_invalid'
            )
    nodes = list(
        version.nodes.select_related('test').prefetch_related(
            'items__asset', 'test__questions__options'
        )
    )
    if not any(n.kind == 'section' for n in nodes):
        add('nodes', 'Kurs wymaga co najmniej jednego działu.')
    for node in nodes:
        path = f'nodes.{node.pk}'
        test = getattr(node, 'test', None)
        missing = test_issues(test, path + '.test') if test else []
        issues.extend(missing)
        if node.kind != 'lesson':
            if not any(n.parent_id == node.pk for n in nodes):
                add(
                    path + '.children',
                    'Element wymaga co najmniej jednego elementu podrzędnego.',
                )
        else:
            items = list(node.items.all())
            if not items and (test is None or missing):
                add(path, 'Lekcja wymaga materiału, zadania lub kompletnego testu.')
            if sum(item.asset_id is not None for item in items) > 20:
                add(
                    path,
                    'Lekcja przekracza limit załączników.',
                    'attachment_limit_exceeded',
                )
            for item in items:
                try:
                    validate_material(item)
                except DomainError as exc:
                    add(
                        f'{path}.items.{item.pk}',
                        str(exc.detail['detail']),
                        str(exc.detail['code']),
                    )
    deps = list(
        NodePrerequisite.objects.filter(target__version=version).select_related(
            'source'
        )
    )
    conflicts = dependency_conflicts(nodes, deps)
    for dep in deps:
        if (
            not hasattr(dep.source, 'test')
            and {'source_id': dep.source_id, 'target_id': dep.target_id}
            not in conflicts
        ):
            conflicts.append({'source_id': dep.source_id, 'target_id': dep.target_id})
    for dep in conflicts:
        add(
            f'nodes.{dep["target_id"]}.prerequisite',
            'Nieprawidłowe wymaganie wstępne.',
            'invalid_prerequisite',
        )
    return {'valid': not issues, 'issues': issues}
