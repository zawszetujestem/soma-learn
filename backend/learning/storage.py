"""Private local storage. Downloads must go through an authorized API view."""
import uuid

from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateMediaStorage(FileSystemStorage):
    def url(self, name):
        raise ValueError('Private media has no public URL.')


def course_asset_path(instance, filename):
    # Never use the user-supplied filename in a storage key.
    return f'courses/{instance.course_id}/{uuid.uuid4().hex}'
