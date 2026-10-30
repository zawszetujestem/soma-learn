import io
import tempfile
from pathlib import Path

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from pypdf import PdfWriter

from learning.models import CourseVersion, CourseNode, CourseAsset
from learning.tests.helpers import make_course, make_user


def image_bytes(fmt='PNG'):
    out = io.BytesIO()
    Image.new('RGB', (2, 2), 'red').save(out, format=fmt)
    return out.getvalue()


def pdf_bytes():
    out = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.write(out)
    return out.getvalue()


class ContentAPICase(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        override = override_settings(
            MEDIA_ROOT=self.temp.name, PRIVATE_MEDIA_ROOT=self.temp.name
        )
        override.enable()
        self.addCleanup(override.disable)
        self.owner = make_user('content-owner@example.com', 'mentor')
        self.other = make_user('content-other@example.com', 'mentor')
        self.admin = make_user('content-admin@example.com', 'admin')
        self.student = make_user('content-student@example.com', 'student')
        self.course = make_course(self.owner, legacy=False)
        self.version = CourseVersion.objects.create(
            course=self.course, number=1, title='Draft'
        )
        self.url = f'/api/courses/{self.course.pk}/versions/{self.version.pk}/'
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.section = self.node('section')
        self.topic = self.node('topic', self.section)
        self.lesson = self.node('lesson', self.topic)

    def node(self, kind, parent=None):
        siblings = self.version.nodes.filter(parent=parent)
        return CourseNode.objects.create(
            version=self.version,
            parent=parent,
            kind=kind,
            title=kind,
            position=max(siblings.values_list('position', flat=True), default=0) + 1,
        )

    def write(self, method, suffix='', data=None, **extra):
        self.version.refresh_from_db()
        extra.setdefault(
            'HTTP_IF_MATCH', f'"v{self.version.pk}-r{self.version.revision}"'
        )
        return getattr(self.client, method)(
            self.url + suffix, data or {}, format='json', **extra
        )

    def error(self, response, status, code):
        self.assertEqual(response.status_code, status, response.content)
        data = response.json()
        self.assertEqual(data['code'], code)
        self.assertIsInstance(data['message'], str)
        self.assertTrue(data['message'].strip())
        return data

    def asset(self, media='image/png'):
        return CourseAsset.objects.create(
            course=self.course,
            created_by=self.owner,
            file='not-a-real-file',
            original_name='a',
            media_type=media,
            size_bytes=10,
        )

    def upload(self, content=None, name='image.png', content_type='image/png', **extra):
        self.version.refresh_from_db()
        return self.client.post(
            self.url + 'assets/',
            {
                'file': SimpleUploadedFile(
                    name, image_bytes() if content is None else content, content_type
                )
            },
            format='multipart',
            HTTP_IF_MATCH=f'"v{self.version.pk}-r{self.version.revision}"',
            **extra,
        )
