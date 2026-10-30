from pathlib import Path
from unittest import mock
from django.test import override_settings
from django.core.management import call_command
from learning.models import CourseAsset, LessonItem, Instance, CourseVersion
from learning.tests.content_helpers import ContentAPICase, image_bytes


class AssetsAPITests(ContentAPICase):
    def attach(self, asset):
        return LessonItem.objects.create(
            lesson=self.lesson,
            category='theory',
            format='image',
            asset=asset,
            image_alt='Alt',
            position=1,
        )

    def test_upload_list_download_and_delete_unused(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertNotIn('file', response.data)
        asset = CourseAsset.objects.get(pk=response.data['id'])
        self.assertTrue(Path(asset.file.path).exists())
        download = self.url + f'assets/{asset.pk}/download/'
        self.error(self.client.get(download), 404, 'not_found')
        item = self.attach(asset)
        response = self.client.get(download)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertIn('no-store', response['Cache-Control'])
        self.assertIn('inline', response['Content-Disposition'])
        self.assertEqual(b''.join(response.streaming_content), image_bytes())
        listing = self.client.get(f'/api/courses/{self.course.pk}/assets/').data
        self.assertEqual(listing['used_bytes'], len(image_bytes()))
        self.assertEqual(listing['assets'][0]['reference_count'], 1)
        self.assertFalse(listing['assets'][0]['can_delete'])
        delete = f'/api/courses/{self.course.pk}/assets/{asset.pk}/'
        self.error(self.client.delete(delete), 409, 'asset_in_use')
        item.delete()
        path = asset.file.path
        self.assertEqual(self.client.delete(delete).status_code, 204)
        self.assertFalse(Path(path).exists())

    def test_download_permissions_exact_version_and_foreign_file(self):
        response = self.upload()
        asset = CourseAsset.objects.get(pk=response.data['id'])
        self.attach(asset)
        download = self.url + f'assets/{asset.pk}/download/'
        for user, status in ((None, 401), (self.other, 404), (self.student, 404)):
            self.client.force_authenticate(user)
            self.error(
                self.client.get(download),
                status,
                'not_authenticated' if status == 401 else 'not_found',
            )
        Instance.objects.create(
            course=self.course,
            course_version=self.version,
            student=self.student,
            mentor=self.other,
            status='closed',
        )
        for user in (self.student, self.other, self.admin):
            self.client.force_authenticate(user)
            response = self.client.get(download)
            self.assertEqual(response.status_code, 200)
            list(response.streaming_content)
        v2 = CourseVersion.objects.create(
            course=self.course, number=2, state='published'
        )
        self.error(
            self.client.get(
                download.replace(f'versions/{self.version.pk}/', f'versions/{v2.pk}/')
            ),
            404,
            'not_found',
        )

    def test_storage_limit_boundaries_and_compensation(self):
        size = len(image_bytes())
        for delta in (-1, 0, 1):
            with (
                self.subTest(delta=delta),
                override_settings(COURSE_STORAGE_MAX_BYTES=size + delta),
            ):
                response = self.upload()
                if delta < 0:
                    self.error(response, 409, 'course_storage_limit_exceeded')
                else:
                    self.assertEqual(response.status_code, 201)
                    self.assertEqual(
                        self.client.delete(
                            f'/api/courses/{self.course.pk}/assets/{response.data["id"]}/'
                        ).status_code,
                        204,
                    )
        self.client.raise_request_exception = False
        with mock.patch(
            'learning.asset_services.CourseAsset.save',
            side_effect=OSError('private secret'),
        ):
            self.error(self.upload(), 500, 'internal_error')
        self.assertFalse(CourseAsset.objects.exists())
        self.assertEqual(
            [p for p in Path(self.temp.name).rglob('*') if p.is_file()], []
        )

    def test_invalid_upload_and_cleanup_pending_delete(self):
        self.error(self.upload(b'fake', 'fake.png'), 400, 'invalid_file')
        response = self.upload()
        asset = CourseAsset.objects.get(pk=response.data['id'])
        path = asset.file.path
        with mock.patch.object(
            type(asset.file.storage), 'delete', side_effect=OSError('disk')
        ):
            self.client.raise_request_exception = False
            self.error(
                self.client.delete(f'/api/courses/{self.course.pk}/assets/{asset.pk}/'),
                500,
                'internal_error',
            )
        asset.refresh_from_db()
        self.assertEqual(asset.state, 'pending_delete')
        call_command('cleanup_course_assets')
        self.assertFalse(CourseAsset.objects.filter(pk=asset.pk).exists())
        self.assertFalse(Path(path).exists())

    def test_pdf_download_attachment_and_spoofed_declared_mime(self):
        from learning.tests.content_helpers import pdf_bytes

        response = self.upload(pdf_bytes(), 'document.pdf', 'image/png')
        self.assertEqual(response.status_code, 201)
        asset = CourseAsset.objects.get(pk=response.data['id'])
        LessonItem.objects.create(
            lesson=self.lesson, category='theory', format='pdf', asset=asset, position=1
        )
        response = self.client.get(self.url + f'assets/{asset.pk}/download/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment', response['Content-Disposition'])
        list(response.streaming_content)

    def test_quota_counts_asset_once_across_versions_and_unused_uploads(self):
        size = len(image_bytes())
        with override_settings(COURSE_STORAGE_MAX_BYTES=2 * size):
            response = self.upload()
            asset = CourseAsset.objects.get(pk=response.data['id'])
            self.attach(asset)
            v2 = CourseVersion.objects.create(
                course=self.course, number=2, state='published'
            )
            from learning.models import CourseNode

            section = CourseNode.objects.create(
                version=v2, kind='section', title='S', position=1
            )
            topic = CourseNode.objects.create(
                version=v2, kind='topic', title='T', position=1, parent=section
            )
            lesson = CourseNode.objects.create(
                version=v2, kind='lesson', title='L', position=1, parent=topic
            )
            LessonItem.objects.create(
                lesson=lesson,
                category='theory',
                format='image',
                asset=asset,
                image_alt='Alt',
                position=1,
            )
            self.assertEqual(self.upload().status_code, 201)
            self.error(self.upload(), 409, 'course_storage_limit_exceeded')
            listing = self.client.get(f'/api/courses/{self.course.pk}/assets/').data
            self.assertEqual(listing['used_bytes'], size * 2)
            self.assertEqual(listing['assets'][0]['reference_count'], 2)
            self.error(
                self.client.delete(f'/api/courses/{self.course.pk}/assets/{asset.pk}/'),
                409,
                'asset_in_use',
            )

    def test_failure_after_file_and_record_write_compensates(self):
        self.client.raise_request_exception = False
        with mock.patch(
            'learning.content_services.bump_revision',
            side_effect=RuntimeError('secret'),
        ):
            self.error(self.upload(), 500, 'internal_error')
        self.assertFalse(CourseAsset.objects.exists())
        self.assertEqual(
            [p for p in Path(self.temp.name).rglob('*') if p.is_file()], []
        )
        self.version.refresh_from_db()
        self.assertEqual(self.version.revision, 1)

    def test_cleanup_removes_old_orphans_not_referenced_or_recent_files(self):
        import os, time

        response = self.upload()
        asset = CourseAsset.objects.get(pk=response.data['id'])
        folder = Path(asset.file.path).parent
        orphan = folder / 'orphan'
        orphan.write_bytes(b'abandoned')
        recent = folder / 'recent'
        recent.write_bytes(b'in-flight')
        temporary = Path(self.temp.name) / 'tmp'
        temporary.mkdir()
        old_temp = temporary / 'old'
        old_temp.write_bytes(b'temporary')
        for path in (orphan, asset.file.path, old_temp):
            os.utime(path, (time.time() - 90000, time.time() - 90000))
        call_command('cleanup_course_assets')
        self.assertFalse(orphan.exists())
        self.assertFalse(old_temp.exists())
        self.assertTrue(recent.exists())
        self.assertTrue(Path(asset.file.path).exists())

    def test_foreign_asset_cannot_be_attached_or_downloaded(self):
        from learning.tests.helpers import make_course

        other = make_course(self.other)
        asset = CourseAsset.objects.create(
            course=other,
            created_by=self.other,
            file='secret',
            size_bytes=10,
            media_type='image/png',
            original_name='secret.png',
        )
        self.error(
            self.write(
                'post',
                f'lessons/{self.lesson.pk}/items/',
                {
                    'category': 'theory',
                    'format': 'image',
                    'image_alt': 'Alt',
                    'asset_id': str(asset.pk),
                },
            ),
            404,
            'not_found',
        )
        self.error(
            self.client.get(self.url + f'assets/{asset.pk}/download/'), 404, 'not_found'
        )
        self.error(
            self.client.delete(f'/api/courses/{self.course.pk}/assets/{asset.pk}/'),
            404,
            'not_found',
        )
