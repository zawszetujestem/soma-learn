import os
import runpy
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase

from learning import services
from learning.models import (Course, CourseScope, CourseSubject, CourseVersion, CourseNode,
    NodePrerequisite, LessonItem, NodeTest, TestQuestion, TestOption, CourseAsset, Instance)
from learning.storage import PrivateMediaStorage
from learning.tests.helpers import make_user, make_course


class VersionModelTests(TestCase):
    def setUp(self):
        self.owner = make_user('version-owner@example.com', 'mentor')
        self.course = make_course(self.owner, legacy=False)
        self.version = CourseVersion.objects.create(course=self.course, number=1, title='V1')

    def assert_db_rejects(self, callback):
        with self.assertRaises(IntegrityError), transaction.atomic():
            callback()

    def test_version_number_and_single_working_successor(self):
        self.assert_db_rejects(lambda: CourseVersion.objects.create(course=self.course, number=1))
        self.assert_db_rejects(lambda: CourseVersion.objects.create(course=self.course, number=2))
        self.assert_db_rejects(lambda: CourseVersion.objects.create(course=self.course, number=0, state='published'))
        self.assert_db_rejects(lambda: CourseVersion.objects.create(course=self.course, number=2, state='published', revision=0))
        self.version.state = 'published'
        self.version.save()
        CourseVersion.objects.create(course=self.course, number=2)

    def test_dictionary_independence_deactivation_and_protection(self):
        scope = CourseScope.objects.create(name='Zakres')
        subject = CourseSubject.objects.create(name='Przedmiot')
        self.version.scope = scope
        self.version.subject = subject
        self.version.state = 'published'
        self.version.save()
        CourseVersion.objects.create(course=self.course, number=2, scope=scope, subject=subject)
        scope.is_active = False
        scope.save()
        self.version.refresh_from_db()
        self.assertEqual(self.version.scope_id, scope.pk)
        self.assertEqual(self.version.state, 'published')
        for entry in (scope, subject):
            with self.assertRaises(ProtectedError):
                entry.delete()
            self.assertIn(type(entry), admin.site._registry)
            self.assertIn('is_active', admin.site._registry[type(entry)].list_editable)

    def test_hierarchy_and_sibling_positions(self):
        section = CourseNode.objects.create(version=self.version, kind='section', title='D', position=1)
        topic = CourseNode.objects.create(version=self.version, kind='topic', parent=section, title='T', position=1)
        lesson = CourseNode.objects.create(version=self.version, kind='lesson', parent=topic, title='L', position=1)
        lesson.full_clean()
        for kind, parent in [('topic', None), ('lesson', section), ('section', topic)]:
            with self.subTest(kind=kind), self.assertRaises(ValidationError):
                CourseNode(version=self.version, kind=kind, parent=parent, title='X', position=2).full_clean()
        other = make_course(self.owner, legacy=False)
        v2 = CourseVersion.objects.create(course=other, number=1)
        with self.assertRaises(ValidationError):
            CourseNode(version=v2, kind='topic', parent=section, title='X', position=1).full_clean()
        self.assert_db_rejects(lambda: CourseNode.objects.create(version=self.version, kind='section', title='Dup', position=1))
        self.assert_db_rejects(lambda: CourseNode.objects.create(version=self.version, kind='lesson', parent=topic, title='Dup', position=1))
        self.assert_db_rejects(lambda: CourseNode.objects.create(version=self.version, kind='section', title='Zero', position=0))

    def test_test_uniqueness_prerequisite_range_and_ordered_definitions(self):
        node = CourseNode.objects.create(version=self.version, kind='section', title='D', position=1)
        target = CourseNode.objects.create(version=self.version, kind='section', title='D2', position=2)
        test = NodeTest.objects.create(node=node)
        self.assert_db_rejects(lambda: NodeTest.objects.create(node=node))
        for threshold in (0, 101):
            self.assert_db_rejects(lambda: NodePrerequisite.objects.create(target=target, source=node, threshold=threshold))
        NodePrerequisite.objects.create(target=target, source=node, threshold=70)
        with self.assertRaises(ProtectedError):
            node.delete()
        question = TestQuestion.objects.create(test=test, position=1, type='single')
        TestOption.objects.create(question=question, position=1)
        self.assert_db_rejects(lambda: TestQuestion.objects.create(test=test, position=1))
        self.assert_db_rejects(lambda: TestOption.objects.create(question=question, position=1))

    def test_lesson_items_and_assets_constraints(self):
        section = CourseNode.objects.create(version=self.version, kind='section', title='D', position=1)
        topic = CourseNode.objects.create(version=self.version, kind='topic', parent=section, title='T', position=1)
        lesson = CourseNode.objects.create(version=self.version, kind='lesson', parent=topic, title='L', position=1)
        LessonItem.objects.create(lesson=lesson, category='theory', format='markdown', text='Text', position=1)
        LessonItem.objects.create(lesson=lesson, category='practice', format='text', text='Task', position=1)
        self.assert_db_rejects(lambda: LessonItem.objects.create(lesson=lesson, category='theory', format='markdown', position=1))
        self.assert_db_rejects(lambda: LessonItem.objects.create(lesson=lesson, category='practice', format='text', position=2, answer_mode='open', answer_text='secret'))
        with self.assertRaises(ValidationError):
            LessonItem(lesson=section, category='theory', format='markdown', position=1).full_clean()
        self.assert_db_rejects(lambda: CourseAsset.objects.create(course=self.course, created_by=self.owner, size_bytes=0))
        asset = CourseAsset.objects.create(course=self.course, created_by=self.owner, size_bytes=10, file='random.pdf', original_name='a.pdf', media_type='application/pdf')
        item = LessonItem.objects.create(lesson=lesson, category='theory', format='pdf', asset=asset, position=2)
        with self.assertRaises(ProtectedError):
            asset.delete()
        self.assertIsInstance(item.asset.file.storage, PrivateMediaStorage)

    def test_new_service_creates_only_draft_for_all_visibilities(self):
        for visibility in ['public','private']:
            course=services.create_course(self.owner,title='New',description='',visibility=visibility)
            self.assertEqual(course.versions.get().state,'draft')
            self.assertFalse(course.versions.get().legacy_import)
            self.assertIsNone(course.current_published_version_id)

    def test_join_requires_publication_and_database_column_is_required(self):
        student=make_user('version-student@example.com','student')
        self.version.state='published'; self.version.save()
        newer=CourseVersion.objects.create(course=self.course,number=2)
        from learning.services import DomainError
        with self.assertRaises(DomainError):
            services.join_course(student,course_id=self.course.pk)
        self.course.current_published_version=self.version; self.course.save()
        instance,_=services.join_course(student,course_id=self.course.pk)
        self.assertEqual(instance.course_version_id,self.version.pk)
        self.assert_db_rejects(lambda: Instance.objects.filter(pk=instance.pk).update(course_version=None))
        with self.assertRaises(ProtectedError):
            instance.course_version.delete()

    def test_private_storage_has_no_public_url(self):
        storage = PrivateMediaStorage()
        self.assertEqual(str(storage.location), str(settings.MEDIA_ROOT))
        with self.assertRaises(ValueError):
            storage.url('private.pdf')
        self.assertEqual(self.client.get('/media/private.pdf').status_code, 404)

    def test_private_media_setting_env_and_local_fallback(self):
        with mock.patch.dict(os.environ, {'PRIVATE_MEDIA_ROOT': '/var/lib/soma/private-media'}):
            configured = runpy.run_path(str(settings.BASE_DIR / 'config' / 'settings.py'))
            self.assertEqual(configured['MEDIA_ROOT'], Path('/var/lib/soma/private-media'))
        with mock.patch.dict(os.environ, {'PRIVATE_MEDIA_ROOT': ''}):
            configured = runpy.run_path(str(settings.BASE_DIR / 'config' / 'settings.py'))
            self.assertEqual(configured['MEDIA_ROOT'], settings.BASE_DIR / 'private_media')

    def test_storage_keys_ignore_untrusted_filename(self):
        from learning.storage import course_asset_path
        asset = CourseAsset(course=self.course)
        first = course_asset_path(asset, '../../secret-original.pdf')
        second = course_asset_path(asset, '../../secret-original.pdf')
        self.assertNotEqual(first, second)
        self.assertNotIn('secret', first)
        self.assertNotIn('..', first)
