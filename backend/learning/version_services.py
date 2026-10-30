"""Version lifecycle. Lock order is always course, then version."""
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from . import content_services as content
from .models import (Course, CourseVersion, CourseNode, LessonItem, NodeTest,
                     TestQuestion, TestOption, NodePrerequisite)
from .services import conflict, forbidden
from .validators import invalid, validate_version_for_publication


def require_revision(version, if_match):
    if not if_match:
        raise invalid('revision_required', 'Wymagany jest nagłówek If-Match.')
    if if_match != content.etag(version):
        raise conflict('stale_revision', 'Wersja została zmieniona. Odśwież dane.')


def check_competence(user, course, operation):
    owner = course.owner_id == user.pk and (user.has_role('mentor') or user.has_role('admin'))
    owner_admin = course.owner.has_role('admin')
    allowed = {
        'submit': owner and course.visibility == 'public' and not owner_admin,
        'withdraw': owner,
        'publish': owner and (course.visibility == 'private' or owner_admin),
        'accept': user.has_role('admin') and course.visibility == 'public' and not owner_admin,
        'reject': user.has_role('admin'),
    }
    if not allowed.get(operation):
        raise forbidden('Nie masz uprawnień do tej operacji.')


def require_complete(version):
    result = validate_version_for_publication(version)
    if not result['valid']:
        error = invalid('version_incomplete', 'Uzupełnij wersję przed zgłoszeniem lub publikacją.')
        error.detail['issues'] = result['issues']
        raise error


@transaction.atomic
def transition(user, course_id, version_id, if_match, operation, *, reason=''):
    content.get_version(user, course_id, version_id)
    course = Course.objects.select_for_update().get(pk=course_id)
    if not content.can_manage(user, course):
        from .services import not_found
        raise not_found()
    version = CourseVersion.objects.select_for_update().get(pk=version_id, course=course)
    version.course = course
    check_competence(user, course, operation)
    allowed = ('submitted',) if operation in ('withdraw', 'accept', 'reject') else ('draft', 'rejected')
    if version.state not in allowed:
        raise conflict('invalid_version_state', 'Operacja niedozwolona w tym stanie wersji.')
    require_revision(version, if_match)
    if operation in ('submit', 'publish', 'accept'):
        require_complete(version)
    now = timezone.now()
    version.state = {'submit':'submitted', 'withdraw':'draft', 'publish':'published', 'accept':'published', 'reject':'rejected'}[operation]
    if operation == 'submit':
        version.submitted_at = now
        version.rejection_reason = ''
    if operation in ('accept', 'reject'):
        version.reviewed_at = now
        version.reviewed_by = user
        version.rejection_reason = reason if operation == 'reject' else ''
    if version.state == 'published':
        version.published_at = now
        version.rejection_reason = ''
    version.revision += 1
    version.save()
    if version.state == 'published':
        course.current_published_version = version
        course.save(update_fields=['current_published_version', 'updated_at'])
    return version


@transaction.atomic
def copy_publication(user, course_id):
    content.get_course(user, course_id)
    course = Course.objects.select_for_update().get(pk=course_id)
    if not content.can_manage(user, course):
        from .services import not_found
        raise not_found()
    if course.versions.exclude(state='published').exists():
        raise conflict('working_version_exists', 'Kurs ma już wersję roboczą.')
    source = course.current_published_version
    if source is None:
        raise conflict('invalid_version_state', 'Brak opublikowanej wersji do skopiowania.')
    number = (course.versions.aggregate(n=Max('number'))['n'] or 0) + 1
    draft = CourseVersion.objects.create(course=course, number=number, title=source.title,
        description=source.description, scope=source.scope, subject=source.subject)
    nodes = list(source.nodes.all())
    mapped = {}
    # Parent-first traversal independent of sibling position or database IDs.
    def copy_nodes(parent=None):
        for node in nodes:
            if node.parent_id != parent:
                continue
            new = CourseNode.objects.create(version=draft, kind=node.kind,
                parent=mapped.get(parent), title=node.title, position=node.position)
            mapped[node.pk] = new
            copy_nodes(node.pk)
    copy_nodes()
    for node in nodes:
        new = mapped[node.pk]
        for item in node.items.all():
            LessonItem.objects.create(lesson=new, **{field:getattr(item,field) for field in
                ('category','format','position','text','asset_id','video_url','image_alt','answer_mode','answer_text')})
        test = getattr(node, 'test', None)
        if test:
            new_test = NodeTest.objects.create(node=new)
            for question in test.questions.all():
                new_question = TestQuestion.objects.create(test=new_test, position=question.position,
                    text=question.text, type=question.type)
                TestOption.objects.bulk_create([TestOption(question=new_question,
                    position=o.position,text=o.text,is_correct=o.is_correct) for o in question.options.all()])
    for dep in NodePrerequisite.objects.filter(target__version=source):
        NodePrerequisite.objects.create(target=mapped[dep.target_id], source=mapped[dep.source_id], threshold=dep.threshold)
    return draft
