"""Private assets, course-wide quotas and recoverable physical deletion."""

from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum

from . import content_services as content
from .content_serializers import asset_data
from .models import Course, CourseAsset, Instance
from .services import conflict, not_found
from .storage import course_asset_path


def storage_limit():
    return getattr(settings, 'COURSE_STORAGE_MAX_BYTES', 1_000_000_000)


def used_bytes(course):
    return course.assets.aggregate(total=Sum('size_bytes'))['total'] or 0


def upload_asset(version, user, upload, validated):
    media_type, size = validated
    if used_bytes(version.course) + size > storage_limit():
        raise conflict(
            'course_storage_limit_exceeded',
            'Przekroczono limit miejsca na pliki kursu.',
        )
    asset = CourseAsset(
        course=version.course,
        created_by=user,
        media_type=media_type,
        size_bytes=size,
        original_name=Path(upload.name.replace('\\', '/')).name[:255],
    )
    storage = asset.file.storage
    name = course_asset_path(asset, upload.name)
    try:
        name = storage.save(name, upload)
        asset.file.name = name
        asset.save()
        return asset
    except Exception:
        storage.delete(name)
        raise


def list_assets(course):
    assets = []
    for asset in course.assets.prefetch_related('items').order_by('created_at', 'pk'):
        count = len(asset.items.all())
        assets.append(
            dict(asset_data(asset), reference_count=count, can_delete=count == 0)
        )
    return {
        'used_bytes': used_bytes(course),
        'limit_bytes': storage_limit(),
        'assets': assets,
    }


def delete_asset(user, course_id, asset_id):
    content.get_course(user, course_id)
    with transaction.atomic():
        course = Course.objects.select_for_update().get(pk=course_id)
        if not content.can_manage(user, course):
            raise not_found()
        asset = course.assets.filter(pk=asset_id).first()
        if asset is None:
            raise not_found()
        if asset.items.exists():
            raise conflict('asset_in_use', 'Plik jest używany w treści kursu.')
        asset.state = 'pending_delete'
        asset.save(update_fields=['state'])
    # Persist pending_delete BEFORE touching the filesystem; failed deletion
    # remains accounted for and is retried by cleanup_course_assets.
    finalize_delete(course_id, asset_id)


def finalize_delete(course_id, asset_id):
    with transaction.atomic():
        Course.objects.select_for_update().get(pk=course_id)
        asset = CourseAsset.objects.filter(
            pk=asset_id, course_id=course_id, state='pending_delete'
        ).first()
        if asset is not None and not asset.items.exists():
            asset.file.delete(save=False)
            asset.delete()


def downloadable_asset(user, course_id, version_id, asset_id):
    course = Course.objects.filter(pk=course_id).first()
    if course is None:
        raise not_found()
    allowed = (
        content.can_manage(user, course)
        or Instance.objects.filter(
            Q(student=user) | Q(mentor=user),
            course=course,
            course_version_id=version_id,
        ).exists()
    )
    if not allowed:
        raise not_found()
    asset = (
        course.assets.filter(
            pk=asset_id, state='ready', items__lesson__version_id=version_id
        )
        .distinct()
        .first()
    )
    if asset is None:
        raise not_found()
    return asset
