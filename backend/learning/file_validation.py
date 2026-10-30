"""Validate actual bytes, not browser MIME/extension. No network or AV claim."""

import warnings

from django.conf import settings
from PIL import Image
from pypdf import PdfReader

from .services import DomainError


def validate_file(upload):
    invalid = DomainError(
        'invalid_file',
        'Nieprawidłowy lub uszkodzony plik PDF/JPG/PNG/WebP.',
        status_code=400,
    )
    try:
        upload.seek(0)
        signature = upload.read(16)
        upload.seek(0)
        if signature.startswith(b'%PDF-'):
            media_type = 'application/pdf'
            limit = getattr(settings, 'COURSE_PDF_MAX_BYTES', 20_000_000)
        elif signature.startswith((b'\x89PNG\r\n\x1a\n', b'\xff\xd8\xff')) or (
            signature[:4] == b'RIFF' and signature[8:12] == b'WEBP'
        ):
            media_type = None
            limit = getattr(settings, 'COURSE_IMAGE_MAX_BYTES', 5_000_000)
        else:
            raise invalid
        size = 0
        for chunk in upload.chunks():
            size += len(chunk)
            if size > limit:
                raise DomainError(
                    'file_too_large',
                    'Plik przekracza dozwolony rozmiar.',
                    status_code=413,
                )
        upload.seek(0)
        if media_type == 'application/pdf':
            reader = PdfReader(upload, strict=True)
            if reader.is_encrypted or not reader.pages:
                raise invalid
            # Force lazy page/content references to be parsed as well.
            for page in reader.pages:
                contents = page.get_contents()
                if contents is not None:
                    contents.get_data()
        else:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(upload) as image:
                    fmt = image.format
                    if fmt not in ('JPEG', 'PNG', 'WEBP'):
                        raise invalid
                    image.verify()
                upload.seek(0)
                with Image.open(upload) as image:
                    image.load()
                media_type = {
                    'JPEG': 'image/jpeg',
                    'PNG': 'image/png',
                    'WEBP': 'image/webp',
                }[fmt]
        if size <= 0:
            raise invalid
        return media_type, size
    except DomainError:
        raise
    except Exception:  # noqa: BLE001 - untrusted parser boundary; never expose parser details
        # Parser errors must not disclose file contents or local paths.
        raise invalid from None
    finally:
        upload.seek(0)
