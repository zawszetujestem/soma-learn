from django.test import SimpleTestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from learning.tests.content_helpers import image_bytes, pdf_bytes


class FileValidationTests(SimpleTestCase):
    def validate(self, data, mime='application/octet-stream'):
        from learning.file_validation import validate_file

        return validate_file(SimpleUploadedFile('untrusted.bin', data, mime))

    def test_real_formats_ignore_browser_mime(self):
        for fmt, mime in (
            ('PNG', 'image/png'),
            ('JPEG', 'image/jpeg'),
            ('WEBP', 'image/webp'),
        ):
            self.assertEqual(
                self.validate(image_bytes(fmt), 'application/pdf')[0], mime
            )
        self.assertEqual(self.validate(pdf_bytes(), 'image/png')[0], 'application/pdf')

    def test_forgery_corruption_and_encryption(self):
        import io
        from pypdf import PdfWriter
        from learning.services import DomainError

        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        writer.encrypt('secret')
        out = io.BytesIO()
        writer.write(out)
        for data in (
            b'',
            b'not an image',
            b'%PDF-1.7 fake',
            image_bytes()[:30],
            pdf_bytes()[:80],
            out.getvalue(),
        ):
            with self.subTest(data=data[:10]), self.assertRaises(DomainError) as ctx:
                self.validate(data, 'image/png')
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertEqual(ctx.exception.detail['code'], 'invalid_file')

    def test_limit_minus_one_exact_plus_one(self):
        from learning.services import DomainError

        for data, setting in (
            (image_bytes(), 'COURSE_IMAGE_MAX_BYTES'),
            (pdf_bytes(), 'COURSE_PDF_MAX_BYTES'),
        ):
            for delta in (-1, 0, 1):
                with (
                    self.subTest(setting=setting, delta=delta),
                    override_settings(**{setting: len(data) + delta}),
                ):
                    if delta < 0:
                        with self.assertRaises(DomainError) as ctx:
                            self.validate(data)
                        self.assertEqual(ctx.exception.status_code, 413)
                        self.assertEqual(ctx.exception.detail['code'], 'file_too_large')
                    else:
                        self.assertEqual(self.validate(data)[1], len(data))

    def test_real_decimal_byte_limits_minus_one_exact_plus_one(self):
        from learning.services import DomainError

        for original, limit, pdf in (
            (image_bytes(), 5_000_000, False),
            (pdf_bytes(), 20_000_000, True),
        ):
            for delta in (-1, 0, 1):
                target = limit + delta
                if pdf:
                    marker = original.rindex(b'\nstartxref')
                    # PDF comment inserted after xref/trailer does not shift object offsets.
                    data = (
                        original[:marker]
                        + b'\n%'
                        + b'x' * (target - len(original) - 3)
                        + b'\n'
                        + original[marker:]
                    )
                else:
                    data = original + b'\0' * (target - len(original))
                self.assertEqual(len(data), target)
                with self.subTest(pdf=pdf, delta=delta):
                    if delta > 0:
                        with self.assertRaises(DomainError) as ctx:
                            self.validate(data)
                        self.assertEqual(ctx.exception.status_code, 413)
                    else:
                        self.assertEqual(self.validate(data)[1], target)

    def test_decompression_bomb_is_rejected(self):
        from unittest import mock
        from learning.services import DomainError

        with (
            mock.patch('PIL.Image.MAX_IMAGE_PIXELS', 1),
            self.assertRaises(DomainError) as ctx,
        ):
            self.validate(image_bytes())
        self.assertEqual(ctx.exception.detail['code'], 'invalid_file')
