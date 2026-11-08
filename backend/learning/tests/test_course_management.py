from pathlib import Path
from unittest import mock

from django.core.management import call_command

from learning import services
from learning.models import (
    Course, CourseAsset, CourseNode, CourseTask, CourseVersion, Instance,
    LessonItem, NodePrerequisite, NodeTest, TestOption, TestQuestion,
)
from learning.tests.content_helpers import ContentAPICase
from learning.tests.helpers import make_course, make_user
from learning.tests import test_version_lifecycle as lifecycle


class CourseManagementTests(ContentAPICase):
    complete = lifecycle.VersionLifecycleTests.complete
    def historical_publication(self):
        # Deliberately no current pointer: historical state is authoritative.
        return CourseVersion.objects.create(
            course=self.course, number=2, state='published', title='History'
        )

    def test_mine_preserves_authorship_and_limits_admin_private_catalog(self):
        private = make_course(self.owner, visibility='private')
        foreign = make_course(self.other)
        admin_private = make_course(self.admin, visibility='private')
        self.historical_publication()
        for user, expected in (
            (self.owner, [self.course.pk, private.pk]),
            (self.admin, [self.course.pk, foreign.pk, admin_private.pk]),
            (self.other, [foreign.pk]),
        ):
            self.client.force_authenticate(user)
            response = self.client.get('/api/courses/mine/')
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual([c['id'] for c in response.data], expected)
            for pk in expected:
                detail = self.client.get(f'/api/courses/mine/{pk}/')
                self.assertEqual(detail.status_code, 200, detail.content)
                self.assertEqual(detail.data['id'], pk)
            if user == self.admin:
                self.assertNotIn(private.invite_token, str(response.data))
                self.error(self.client.get(f'/api/courses/mine/{private.pk}/'), 404, 'not_found')
                self.error(self.client.get(f'/api/courses/mine/{private.pk}/students-count/'),
                           404, 'not_found')
                own = self.client.get(f'/api/courses/mine/{admin_private.pk}/')
                self.assertEqual(own.data['invite_token'], admin_private.invite_token)

    def test_historical_owner_can_read_students_count_without_write_access(self):
        published = self.historical_publication()
        Instance.objects.create(course=self.course, course_version=published,
                                student=self.student, mentor=self.owner)
        for mentor, status in ((self.owner, 'closed'), (self.other, 'active'), (None, 'active')):
            student = make_user(f'count-{status}-{mentor.pk if mentor else "none"}@example.com', 'student')
            Instance.objects.create(course=self.course, course_version=published,
                                    student=student, mentor=mentor, status=status)
        url = f'/api/courses/mine/{self.course.pk}/students-count/'
        for pointer in (None, published):
            Course.objects.filter(pk=self.course.pk).update(
                current_published_version=pointer, is_active=False)
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.data, {'count': 1})
            self.error(self.client.patch(f'/api/courses/{self.course.pk}/',
                                        {'is_active': True}, format='json'), 404, 'not_found')
            self.error(self.client.post(f'/api/courses/{self.course.pk}/tasks/',
                                       {'title': 'Forbidden', 'hours': 1}, format='json'),
                       404, 'not_found')
            self.error(self.client.delete(f'/api/courses/{self.course.pk}/'), 404, 'not_found')
            self.error(self.write('patch', '', {'title': 'Forbidden'}), 404, 'not_found')
        for actor, status, code in ((self.other, 404, 'not_found'),
                                   (self.student, 403, 'forbidden'),
                                   (None, 401, 'not_authenticated')):
            self.client.force_authenticate(actor)
            self.error(self.client.get(url), status, code)

    def test_admin_direct_private_authoring_access_is_unchanged(self):
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(self.write('patch', '', {'title': 'Admin content edit'}).status_code, 200)
        self.error(self.client.get(f'/api/courses/mine/{self.course.pk}/'), 404, 'not_found')

    def test_mine_publication_pointer_and_archive_do_not_remove_owner_read_access(self):
        published = self.historical_publication()
        for pointer in (None, published):
            Course.objects.filter(pk=self.course.pk).update(
                current_published_version=pointer, is_active=False)
            response = self.client.get('/api/courses/mine/')
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual([c['id'] for c in response.data], [self.course.pk])
            detail = self.client.get(f'/api/courses/mine/{self.course.pk}/')
            self.assertEqual(detail.status_code, 200, detail.content)
            self.assertEqual(detail.data['owner'], self.owner.pk)
            self.assertFalse(detail.data['is_active'])
            self.assertEqual(detail.data['working_version']['id'], self.version.pk)
            self.error(self.client.patch(f'/api/courses/{self.course.pk}/',
                                        {'is_active': True}, format='json'), 404, 'not_found')
            self.error(self.client.delete(f'/api/courses/{self.course.pk}/'), 404, 'not_found')
            self.error(self.write('patch', '', {'title': 'Forbidden'}), 404, 'not_found')
        self.client.force_authenticate(self.other)
        self.error(self.client.get(f'/api/courses/mine/{self.course.pk}/'), 404, 'not_found')

    def test_admin_cannot_directly_publish_anothers_first_version_but_can_accept(self):
        self.complete()
        self.client.force_authenticate(self.admin)
        self.error(self.write('post', 'publish/'), 403, 'forbidden')
        self.version.refresh_from_db()
        self.assertEqual(self.version.state, 'draft')
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.write('post', 'submit/').status_code, 200)
        self.client.force_authenticate(self.admin)
        response = self.write('post', 'accept/')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['state'], 'published')

    def mutations(self, asset, item, task):
        base = f'/api/courses/{self.course.pk}/'
        return [
            ('patch', base, {'is_active': False}, None),
            ('post', base + 'tasks/', {'title': 'Plan', 'hours': 1}, None),
            ('patch', base + f'tasks/{task.pk}/', {'title': 'Plan edit'}, None),
            ('delete', base + f'tasks/{task.pk}/', {}, None),
            ('post', base + 'regenerate-token/', {}, None),
            ('post', base + 'resubmit/', {}, self.version),
            ('post', base + 'versions/', {}, None),
            ('delete', base + f'assets/{asset.pk}/', {}, None),
            ('patch', self.url, {'title': 'Metadata'}, self.version),
            ('post', self.url + 'nodes/', {'kind': 'section', 'title': 'S'}, self.version),
            ('patch', self.url + f'nodes/{self.lesson.pk}/', {'title': 'L'}, self.version),
            ('delete', self.url + f'nodes/{self.lesson.pk}/', {}, self.version),
            ('post', self.url + f'nodes/{self.lesson.pk}/move/', {'direction': 'up'}, self.version),
            ('put', self.url + f'nodes/{self.lesson.pk}/prerequisite/', {}, self.version),
            ('delete', self.url + f'nodes/{self.lesson.pk}/prerequisite/', {}, self.version),
            ('post', self.url + f'nodes/{self.lesson.pk}/test/', {}, self.version),
            ('put', self.url + f'nodes/{self.lesson.pk}/test/', {}, self.version),
            ('delete', self.url + f'nodes/{self.lesson.pk}/test/', {}, self.version),
            ('post', self.url + f'lessons/{self.lesson.pk}/items/', {
                'category': 'theory', 'format': 'markdown', 'text': 'New'}, self.version),
            ('patch', self.url + f'lessons/{self.lesson.pk}/items/{item.pk}/', {'text': 'Edit'}, self.version),
            ('delete', self.url + f'lessons/{self.lesson.pk}/items/{item.pk}/', {}, self.version),
            ('post', self.url + f'lessons/{self.lesson.pk}/items/{item.pk}/move/', {'direction': 'up'}, self.version),
        ] + [('post', self.url + op + '/', {}, self.version)
             for op in ('submit', 'withdraw', 'publish', 'accept', 'reject')]

    def test_ever_published_owner_cannot_mutate_any_family(self):
        asset = self.asset()
        item = LessonItem.objects.create(lesson=self.lesson, category='theory',
                                        format='markdown', text='Original', position=1)
        task = CourseTask.objects.create(course=self.course, title='Original', hours=1)
        self.historical_publication()
        for method, url, data, version in self.mutations(asset, item, task):
            with self.subTest(method=method, url=url):
                extra = {'HTTP_IF_MATCH': f'"v{version.pk}-r1"'} if version else {}
                self.error(getattr(self.client, method)(url, data, format='json', **extra),
                           404, 'not_found')
        self.error(self.upload(), 404, 'not_found')
        self.error(self.client.delete(f'/api/courses/{self.course.pk}/'), 404, 'not_found')
        self.course.refresh_from_db()
        self.version.refresh_from_db()
        item.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(self.course.owner_id, self.owner.pk)
        self.assertTrue(self.course.is_active)
        self.assertEqual(self.version.revision, 1)
        self.assertEqual(item.text, 'Original')
        self.assertEqual(task.title, 'Original')
        self.assertTrue(CourseAsset.objects.filter(pk=asset.pk).exists())

    def test_admins_manage_and_directly_publish_successive_public_versions(self):
        self.complete()
        self.version.state = 'submitted'
        self.version.save()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.write('post', 'accept/').status_code, 200)
        for admin in (self.admin, make_user('second-admin@example.com', 'admin')):
            self.client.force_authenticate(admin)
            response = self.client.post(f'/api/courses/{self.course.pk}/versions/', {}, format='json')
            self.assertEqual(response.status_code, 201, response.content)
            self.version = CourseVersion.objects.get(pk=response.data['id'])
            self.url = f'/api/courses/{self.course.pk}/versions/{self.version.pk}/'
            self.assertEqual(self.write('patch', '', {'title': 'Admin edition'}).status_code, 200)
            self.assertEqual(self.write('patch', f'nodes/{self.version.nodes.first().pk}/',
                                        {'title': 'Section edit'}).status_code, 200)
            lesson = self.version.nodes.get(kind='lesson')
            item = self.write('post', f'lessons/{lesson.pk}/items/', {
                'category': 'practice', 'format': 'text', 'text': 'Practice'})
            self.assertEqual(item.status_code, 201, item.content)
            item_url = f'lessons/{lesson.pk}/items/{item.data["id"]}/'
            self.assertEqual(self.write('patch', item_url, {'text': 'Edited practice'}).status_code, 200)
            self.assertEqual(self.write('post', item_url + 'move/', {'direction': 'up'}).status_code, 200)
            self.assertEqual(self.write('delete', item_url).status_code, 204)
            test_url = f'nodes/{lesson.pk}/test/'
            self.assertEqual(self.write('post', test_url).status_code, 201)
            self.assertEqual(self.write('put', test_url, {'questions': []}).status_code, 200)
            other_lesson = self.write('post', 'nodes/', {
                'kind': 'lesson', 'parent_id': lesson.parent_id, 'title': 'New lesson'})
            self.assertEqual(other_lesson.status_code, 201, other_lesson.content)
            node_url = f'nodes/{other_lesson.data["id"]}/'
            self.assertEqual(self.write('put', node_url + 'prerequisite/', {
                'source_id': lesson.pk, 'threshold': 70}).status_code, 200)
            self.assertEqual(self.write('delete', node_url + 'prerequisite/').status_code, 204)
            self.assertEqual(self.write('post', node_url + 'move/', {'direction': 'up'}).status_code, 200)
            self.assertEqual(self.write('delete', node_url).status_code, 204)
            self.assertEqual(self.write('delete', test_url).status_code, 204)
            upload = self.upload()
            self.assertEqual(upload.status_code, 201, upload.content)
            self.assertEqual(self.client.delete(
                f'/api/courses/{self.course.pk}/assets/{upload.data["id"]}/').status_code, 204)
            base = f'/api/courses/{self.course.pk}/'
            self.assertEqual(self.client.patch(base, {'is_active': False}, format='json').status_code, 200)
            response = self.client.post(base + 'tasks/', {'title': 'Plan', 'hours': 2}, format='json')
            self.assertEqual(response.status_code, 201, response.content)
            task_url = base + f'tasks/{response.data["id"]}/'
            self.assertEqual(self.client.patch(task_url, {'title': 'Edit'}, format='json').status_code, 200)
            self.assertEqual(self.client.delete(task_url).status_code, 204)
            published = self.write('post', 'publish/')
            self.assertEqual(published.status_code, 200, published.content)
            self.assertEqual(published.data['state'], 'published')
        self.course.refresh_from_db()
        self.assertEqual(self.course.owner_id, self.owner.pk)

    def test_identity_services_recheck_stale_access_after_first_publication(self):
        stale = services.get_owned_course(self.owner, self.course.pk)
        self.historical_publication()
        for operation in (
            lambda: services.update_course(stale, {'is_active': False}, user=self.owner),
            lambda: services.regenerate_invite_token(stale, user=self.owner),
            lambda: services.delete_course(self.owner, stale.pk),
        ):
            with self.assertRaises(services.DomainError) as caught:
                operation()
            self.assertEqual(caught.exception.status_code, 404)
        self.course.refresh_from_db()
        self.assertTrue(self.course.is_active)

    def test_admin_private_identity_policy_and_prepublication_content_access_unchanged(self):
        private = make_course(self.other, visibility='private')
        self.client.force_authenticate(self.admin)
        self.error(self.client.patch(f'/api/courses/{private.pk}/',
                                    {'is_active': False}, format='json'), 404, 'not_found')
        self.error(self.client.delete(f'/api/courses/{private.pk}/'), 404, 'not_found')
        self.assertEqual(self.write('patch', '', {'title': 'Admin before publish'}).status_code, 200)
        self.assertEqual(self.client.get('/api/course-moderation/').status_code, 200)

    def test_rejected_owner_can_edit_metadata_plan_assets_and_resubmit_before_publish(self):
        self.complete()
        self.version.state = 'rejected'
        self.version.save()
        self.assertEqual(self.write('patch', '', {'title': 'Fixed'}).status_code, 200)
        self.assertEqual(self.upload().status_code, 201)
        base = f'/api/courses/{self.course.pk}/'
        self.assertEqual(self.client.patch(base, {'is_active': False}, format='json').status_code, 200)
        self.assertEqual(self.client.post(base + 'tasks/', {'title': 'Plan', 'hours': 1},
                                          format='json').status_code, 201)
        self.version.refresh_from_db()
        response = self.client.post(base + 'resubmit/', {}, format='json',
                                    HTTP_IF_MATCH=f'"v{self.version.pk}-r{self.version.revision}"')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['working_version']['state'], 'submitted')

    def test_private_owner_keeps_rights_and_assigned_mentor(self):
        Course.objects.filter(pk=self.course.pk).update(visibility='private', invite_token='private-test-token')
        self.course = Course.objects.get(pk=self.course.pk)
        self.complete()
        self.assertEqual(self.write('post', 'publish/').status_code, 200)
        self.course.refresh_from_db()
        instance, _ = services.join_by_token(self.student, self.course.invite_token)
        response = self.client.post(f'/api/courses/{self.course.pk}/versions/', {}, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        base = f'/api/courses/{self.course.pk}/'
        self.assertEqual(self.client.post(base + 'regenerate-token/').status_code, 200)
        self.assertEqual(self.client.patch(base, {'is_active': False}, format='json').status_code, 200)
        instance.refresh_from_db()
        self.assertEqual(instance.mentor_id, self.owner.pk)


class CourseDeletionTests(ContentAPICase):
    complete = lifecycle.VersionLifecycleTests.complete
    def test_hard_delete_removes_protected_graph_and_storage(self):
        upload = self.upload()
        asset = CourseAsset.objects.get(pk=upload.data['id'])
        path = Path(asset.file.path)
        LessonItem.objects.create(lesson=self.lesson, category='theory', format='image',
                                  asset=asset, image_alt='Alt', position=1)
        test = NodeTest.objects.create(node=self.section)
        question = TestQuestion.objects.create(test=test, text='Q', position=1)
        TestOption.objects.create(question=question, text='A', position=1, is_correct=True)
        NodePrerequisite.objects.create(source=self.section, target=self.lesson, threshold=50)
        CourseTask.objects.create(course=self.course, title='Plan', hours=1)
        self.version.state = 'published'
        self.version.save()
        self.course.current_published_version = self.version
        self.course.save()
        self.client.force_authenticate(self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(f'/api/courses/{self.course.pk}/')
        self.assertEqual(response.status_code, 204, response.content)
        for model in (Course, CourseVersion, CourseNode, CourseAsset, CourseTask,
                      LessonItem, NodePrerequisite, NodeTest, TestQuestion, TestOption):
            self.assertFalse(model.objects.exists(), model.__name__)
        self.assertFalse(path.exists())

    def test_archive_preserves_closed_instance_and_active_history_writes(self):
        self.complete()
        asset = CourseAsset.objects.get(pk=self.upload().data['id'])
        path = Path(asset.file.path)
        LessonItem.objects.create(lesson=self.lesson, category='practice', format='image',
                                  asset=asset, image_alt='History', position=1)
        self.version.state = 'published'
        self.version.save()
        self.course.current_published_version = self.version
        self.course.save()
        CourseTask.objects.create(course=self.course, title='Plan', hours=1)
        instance, _ = services.join_course(self.student, course_id=self.course.pk)
        self.client.force_authenticate(self.student)
        cycle = self.client.post(f'/api/instances/{instance.pk}/cycles/')
        self.assertEqual(cycle.status_code, 201, cycle.content)
        task_url = f'/api/instances/{instance.pk}/tasks/{instance.tasks.first().pk}/'
        self.assertEqual(self.client.patch(task_url, {'selected': True}, format='json').status_code, 200)
        closed_student = make_user('closed-student@example.com', 'student')
        closed, _ = services.join_course(closed_student, course_id=self.course.pk)
        services.close_instance(closed_student, closed)
        self.client.force_authenticate(self.admin)
        response = self.client.delete(f'/api/courses/{self.course.pk}/')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.data['is_active'])
        for actor in (self.student, self.owner):
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get(f'/api/instances/{instance.pk}/content/').status_code, 200)
            download = self.client.get(self.url + f'assets/{asset.pk}/download/')
            self.assertEqual(download.status_code, 200, download)
            self.assertTrue(b''.join(download.streaming_content))
        self.assertTrue(path.exists())
        self.assertTrue(CourseAsset.objects.filter(pk=asset.pk).exists())
        self.client.force_authenticate(self.student)
        self.error(self.client.post(f'/api/courses/{self.course.pk}/join/'), 409, 'course_inactive')
        self.assertEqual(self.client.patch(
            task_url,
            {'status': 'done'}, format='json').status_code, 200)
        services.close_instance(self.student, instance)
        instance.refresh_from_db()
        self.assertEqual(instance.mentor_id, self.owner.pk)
        self.assertEqual(instance.course_version_id, self.version.pk)
        self.assertEqual(instance.periods.count(), 1)
        history = instance.cycles.get()
        self.assertIsNotNone(history.ended_at)
        self.assertEqual(history.entries.get().status, 'done')
        # Even when ALL instances are closed, DELETE remains archival.
        self.client.force_authenticate(self.admin)
        response = self.client.delete(f'/api/courses/{self.course.pk}/')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Instance.objects.filter(course=self.course).count(), 2)
        self.assertEqual(self.client.get(f'/api/instances/{closed.pk}/content/').status_code, 200)

    def test_delete_auth_and_private_owner_archive_blocks_token_join(self):
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        self.course = Course.objects.get(pk=self.course.pk)
        self.version.state = 'published'
        self.version.save()
        self.course.current_published_version = self.version
        self.course.save()
        instance, _ = services.join_by_token(self.student, self.course.invite_token)
        url = f'/api/courses/{self.course.pk}/'
        for user, status, code in ((None, 401, 'not_authenticated'),
                                   (self.student, 403, 'forbidden'),
                                   (self.other, 404, 'not_found')):
            self.client.force_authenticate(user)
            self.error(self.client.delete(url), status, code)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(url).status_code, 200)
        self.client.force_authenticate(self.student)
        self.error(self.client.post(f'/api/courses/join/{self.course.invite_token}/'),
                   409, 'course_inactive')
        instance.refresh_from_db()
        self.assertEqual(instance.mentor_id, self.owner.pk)

    def test_hard_delete_rollback_keeps_file_and_graph(self):
        asset = CourseAsset.objects.get(pk=self.upload().data['id'])
        self.client.raise_request_exception = False
        with mock.patch.object(Course, 'delete', side_effect=RuntimeError('rollback')):
            with self.captureOnCommitCallbacks(execute=True):
                self.error(self.client.delete(f'/api/courses/{self.course.pk}/'),
                           500, 'internal_error')
        self.assertTrue(Course.objects.filter(pk=self.course.pk).exists())
        self.assertTrue(CourseVersion.objects.filter(pk=self.version.pk).exists())
        self.assertTrue(CourseAsset.objects.filter(pk=asset.pk).exists())
        self.assertTrue(Path(asset.file.path).exists())

    def test_storage_failure_after_commit_is_recovered_by_existing_orphan_cleanup(self):
        import os
        import time
        asset = CourseAsset.objects.get(pk=self.upload().data['id'])
        path = Path(asset.file.path)
        with mock.patch.object(type(asset.file.storage), 'delete', side_effect=OSError('disk')):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.delete(f'/api/courses/{self.course.pk}/')
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(Course.objects.filter(pk=self.course.pk).exists())
        self.assertFalse(CourseAsset.objects.filter(pk=asset.pk).exists())
        self.assertTrue(path.exists())
        os.utime(path, (time.time() - 90000, time.time() - 90000))
        call_command('cleanup_course_assets')
        self.assertFalse(path.exists())

    def test_deleted_course_during_join_returns_standard_not_found(self):
        # Simulate join having read the row just before DELETE commits.
        stale = self.course
        CourseVersion.objects.filter(course=self.course).delete()
        Course.objects.filter(pk=self.course.pk).delete()
        # _join is also used by token enrollment.
        with self.assertRaises(services.DomainError) as caught:
            services._join(self.student, stale, via_token=False)
        self.assertEqual(caught.exception.status_code, 404)

    def test_deleted_course_between_authoring_access_and_lock_is_not_found(self):
        from learning import asset_services, content_services, version_services
        stale = self.course
        version = self.version
        CourseVersion.objects.filter(course=stale).delete()
        Course.objects.filter(pk=stale.pk).delete()
        def edit():
            with content_services.edit_version(self.owner, stale.pk, version.pk, '"etag"'):
                self.fail('Deleted course is not editable')
        with mock.patch.object(content_services, 'get_course', return_value=stale), mock.patch.object(
            content_services, 'get_version', return_value=version
        ):
            for callback in (
                edit,
                lambda: version_services.copy_publication(self.owner, stale.pk),
                lambda: version_services.transition(self.owner, stale.pk, version.pk, '"etag"', 'submit'),
                lambda: asset_services.delete_asset(self.owner, stale.pk, '00000000-0000-0000-0000-000000000000'),
            ):
                with self.subTest(callback=callback):
                    with self.assertRaises(services.DomainError) as caught:
                        callback()
                    self.assertEqual(caught.exception.status_code, 404)
