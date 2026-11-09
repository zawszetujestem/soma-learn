import threading

from django.apps import apps
from django.db import IntegrityError, connection, connections, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from drf_spectacular.generators import SchemaGenerator
from rest_framework.test import APIClient

from learning.models import CourseNode, CourseVersion, Instance, InstanceLessonCycleLesson
from learning.tests.test_lesson_cycles import LessonCycleFixture


def progress_model():
    return apps.get_model('learning', 'InstanceLessonProgress')


class ProgressFixture(LessonCycleFixture):
    def setUp(self):
        super().setUp()
        self.second = CourseNode.objects.create(
            version=self.version, parent=self.topic, kind='lesson', title='L2', position=2,
        )
        self.cycle = self.create().json()['planned_cycle']['id']
        for lesson in (self.lesson, self.second):
            self.action(self.cycle, 'lessons', {'lesson_id': lesson.pk})
        self.action(self.cycle, 'start')

    def url(self, lesson=None, cycle=None, instance=None):
        return (f'/api/instances/{instance or self.instance.pk}/lesson-cycles/'
                f'{cycle or self.cycle}/lessons/{lesson or self.lesson.pk}/progress/')

    def patch(self, status, expected_status='todo', expected_revision=0, **scope):
        return self.client.patch(self.url(**scope), {
            'status': status, 'expected_status': expected_status,
            'expected_revision': expected_revision,
        }, format='json')

    def entries(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        return {entry['lesson_id']: entry for entry in response.json()['lesson_progress']}

    def assert_progress(self, response, status, revision, lesson=None):
        pk = lesson or self.lesson.pk
        self.assertEqual(self.entries(response)[pk], {
            'lesson_id': pk, 'status': status, 'revision': revision,
        })


class LessonProgressAPITests(ProgressFixture, TestCase):
    def test_projection_defaults_every_selected_cycle_and_read_does_not_write(self):
        planned = self.create().json()['planned_cycle']['id']
        third = CourseNode.objects.create(
            version=self.version, parent=self.topic, kind='lesson', title='L3', position=3,
        )
        self.action(planned, 'lessons', {'lesson_id': third.pk})
        expected = {
            lesson.pk: {'lesson_id': lesson.pk, 'status': 'todo', 'revision': 0}
            for lesson in (self.lesson, self.second, third)
        }
        self.assertEqual(self.entries(self.client.get(self.base)), expected)
        self.assertEqual(progress_model().objects.count(), 0)
        self.action(self.cycle, 'close')
        self.assertEqual(self.entries(self.client.get(self.base)), expected)
        self.assertEqual(progress_model().objects.count(), 0)

    def test_all_allowed_transitions_for_both_assigned_roles_and_done_terminal(self):
        for user, lesson in ((self.student, self.lesson), (self.mentor, self.second)):
            self.client.force_authenticate(user)
            current = 'todo'
            revision = 0
            for status in (
                'in_progress', 'todo', 'in_progress', 'review', 'revision',
                'in_progress', 'review', 'done',
            ):
                revision += 1
                response = self.patch(status, current, revision - 1, lesson=lesson.pk)
                self.assert_progress(response, status, revision, lesson.pk)
                current = status
            for status in ('todo', 'revision', 'in_progress', 'review', 'done'):
                self.error(self.patch(status, 'done', revision, lesson=lesson.pk),
                           409, 'invalid_lesson_transition')
                self.assert_progress(self.client.get(self.base), 'done', revision, lesson.pk)

    def test_every_invalid_transition_is_atomic(self):
        allowed = {
            'todo': {'in_progress'}, 'revision': {'in_progress'},
            'in_progress': {'todo', 'review'}, 'review': {'revision', 'done'}, 'done': set(),
        }
        model = progress_model()
        for current, targets in allowed.items():
            model.objects.all().delete()
            revision = 0 if current == 'todo' else 4
            if revision:
                model.objects.create(
                    instance=self.instance, lesson=self.lesson, status=current, revision=revision,
                )
            for target in allowed.keys() - targets:
                with self.subTest(current=current, target=target):
                    self.error(self.patch(target, current, revision), 409, 'invalid_lesson_transition')
                    self.assert_progress(self.client.get(self.base), current, revision)
                    self.assertEqual(model.objects.count(), int(revision > 0))

    def test_stale_status_revision_and_aba_prevent_partial_write(self):
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        for current, revision in (('todo', 1), ('in_progress', 0), ('review', 20)):
            self.error(self.patch('review', current, revision), 409, 'stale_lesson_progress')
            self.assert_progress(self.client.get(self.base), 'in_progress', 1)
        self.patch('review', 'in_progress', 1)
        self.patch('revision', 'review', 2)
        self.assert_progress(self.patch('in_progress', 'revision', 3), 'in_progress', 4)
        self.error(self.patch('review', 'in_progress', 1), 409, 'stale_lesson_progress')
        self.assert_progress(self.client.get(self.base), 'in_progress', 4)

    def test_missing_and_invalid_preconditions_have_safe_validation_details(self):
        valid = {'status': 'in_progress', 'expected_status': 'todo', 'expected_revision': 0}
        payloads = [{key: value for key, value in valid.items() if key != omitted}
                    for omitted in valid]
        payloads += [{**valid, key: value} for key, value in (
            ('status', 'invalid'), ('expected_status', 'invalid'),
            ('expected_revision', -1), ('expected_revision', None),
            ('expected_revision', True), ('expected_revision', 1.5),
        )]
        for payload in payloads:
            with self.subTest(payload=payload):
                response = self.client.patch(self.url(), payload, format='json')
                self.error(response, 400, 'validation_error')
                self.assertTrue(set(response.json()) - {'code', 'message'})
        self.assertEqual(progress_model().objects.count(), 0)

    def test_return_to_todo_preserves_row_revision_cas_and_rejects_aba(self):
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        row = progress_model().objects.get(instance=self.instance, lesson=self.lesson)
        for expected_status, expected_revision in (('todo', 1), ('in_progress', 0)):
            self.error(self.patch('todo', expected_status, expected_revision),
                       409, 'stale_lesson_progress')
            self.assert_progress(self.client.get(self.base), 'in_progress', 1)
        self.assert_progress(self.patch('todo', 'in_progress', 1), 'todo', 2)
        row.refresh_from_db()
        self.assertEqual((row.status, row.revision), ('todo', 2))
        self.assertEqual(progress_model().objects.count(), 1)
        self.assert_progress(self.patch('in_progress', 'todo', 2), 'in_progress', 3)
        for target in ('todo', 'review'):
            self.error(self.patch(target, 'in_progress', 1), 409, 'stale_lesson_progress')
            self.assert_progress(self.client.get(self.base), 'in_progress', 3)

    def test_return_to_todo_releases_global_slot_for_another_cycle(self):
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        self.error(self.patch('in_progress', lesson=self.second.pk),
                   409, 'lesson_in_progress_exists')
        self.assert_progress(self.patch('todo', 'in_progress', 1), 'todo', 2)
        self.action(self.cycle, 'close')
        planned = self.create().json()['planned_cycle']['id']
        self.action(planned, 'lessons', {'lesson_id': self.second.pk})
        self.action(planned, 'start')
        self.assert_progress(self.patch('in_progress', cycle=planned, lesson=self.second.pk),
                             'in_progress', 1, self.second.pk)
        self.assert_progress(self.client.get(self.base), 'todo', 2)

    def test_return_to_todo_preserves_access_and_lifecycle_restrictions(self):
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        for user, status, code in (
            (self.owner, 404, 'not_found'), (self.other, 404, 'not_found'),
            (None, 401, 'not_authenticated'),
        ):
            self.client.force_authenticate(user)
            self.error(self.patch('todo', 'in_progress', 1), status, code)
        self.client.force_authenticate(self.student)
        self.assert_progress(self.client.get(self.base), 'in_progress', 1)
        self.instance.status = 'closed'
        self.instance.save()
        for user in (self.student, self.mentor):
            self.client.force_authenticate(user)
            self.error(self.patch('todo', 'in_progress', 1), 409, 'instance_closed')
        self.instance.status = 'active'
        self.instance.save()
        self.action(self.cycle, 'close')
        self.error(self.patch('todo', 'in_progress', 1), 409, 'lesson_cycle_not_active')
        self.assert_progress(self.client.get(self.base), 'in_progress', 1)

    def test_one_in_progress_global_and_review_releases_slot(self):
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        self.error(self.patch('in_progress', lesson=self.second.pk),
                   409, 'lesson_in_progress_exists')
        self.assert_progress(self.client.get(self.base), 'todo', 0, self.second.pk)
        self.assertEqual(progress_model().objects.count(), 1)
        self.patch('review', 'in_progress', 1)
        self.assert_progress(self.patch('in_progress', lesson=self.second.pk),
                             'in_progress', 1, self.second.pk)
        self.patch('revision', 'review', 2)
        self.error(self.patch('in_progress', 'revision', 3), 409, 'lesson_in_progress_exists')
        self.assert_progress(self.client.get(self.base), 'revision', 3)

    def test_completion_and_revision_survive_close_remove_reselect_and_instance_resume(self):
        for status, old, revision in (
            ('in_progress', 'todo', 0), ('review', 'in_progress', 1), ('done', 'review', 2),
        ):
            self.assert_progress(self.patch(status, old, revision), status, revision + 1)
        self.action(self.cycle, 'close')
        planned = self.create().json()['planned_cycle']['id']
        self.action(planned, 'lessons', {'lesson_id': self.lesson.pk})
        self.client.delete(self.base + f'{planned}/lessons/{self.lesson.pk}/')
        self.assert_progress(self.client.get(self.base), 'done', 3)
        # Existing progress must be projected even without any selection.
        InstanceLessonCycleLesson.objects.filter(lesson=self.lesson).delete()
        self.assert_progress(self.client.get(self.base), 'done', 3)
        self.action(planned, 'lessons', {'lesson_id': self.lesson.pk})
        self.action(planned, 'start')
        self.assert_progress(self.client.get(self.base), 'done', 3)
        self.error(self.patch('in_progress', 'done', 3, cycle=planned),
                   409, 'invalid_lesson_transition')
        self.instance.status = 'closed'
        self.instance.save()
        self.assert_progress(self.client.get(self.base), 'done', 3)
        response = self.client.post(f'/api/instances/{self.instance.pk}/resume/')
        self.assertEqual(response.status_code, 200, response.content)
        self.assert_progress(self.client.get(self.base), 'done', 3)

    def test_in_progress_in_previous_cycle_still_blocks_new_selected_lesson(self):
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        self.action(self.cycle, 'close')
        planned = self.create().json()['planned_cycle']['id']
        self.action(planned, 'lessons', {'lesson_id': self.second.pk})
        self.action(planned, 'start')
        self.error(self.patch('in_progress', cycle=planned, lesson=self.second.pk),
                   409, 'lesson_in_progress_exists')
        self.assert_progress(self.client.get(self.base), 'todo', 0, self.second.pk)

    def test_only_current_active_cycle_mutable_and_closed_instance_protected(self):
        planned = self.create().json()['planned_cycle']['id']
        self.action(planned, 'lessons', {'lesson_id': self.lesson.pk})
        self.error(self.patch('in_progress', cycle=planned), 409, 'lesson_cycle_not_active')
        self.action(self.cycle, 'close')
        self.error(self.patch('in_progress'), 409, 'lesson_cycle_not_active')
        self.action(planned, 'start')
        self.error(self.patch('in_progress'), 409, 'lesson_cycle_not_active')
        self.instance.status = 'closed'
        self.instance.save()
        for user in (self.student, self.mentor):
            self.client.force_authenticate(user)
            self.error(self.patch('in_progress', cycle=planned), 409, 'instance_closed')
        self.assertEqual(progress_model().objects.count(), 0)

    def test_role_access_others_404_even_with_invalid_body_and_anonymous_401(self):
        stranger = Instance.objects.create(
            course=self.course, course_version=self.version, student=self.other,
        )
        for user in (self.owner, self.other):
            self.client.force_authenticate(user)
            self.error(self.patch('in_progress'), 404, 'not_found')
            self.error(self.client.patch(self.url(), {}, format='json'), 404, 'not_found')
        self.client.force_authenticate(self.student)
        self.error(self.patch('in_progress', instance=stranger.pk), 404, 'not_found')
        self.error(self.patch('in_progress', instance=999999), 404, 'not_found')
        self.client.force_authenticate(None)
        self.error(self.patch('in_progress'), 401, 'not_authenticated')
        self.assertEqual(progress_model().objects.count(), 0)

    def test_instance_scope_selected_lesson_kind_and_version_pinning(self):
        other = Instance.objects.create(
            course=self.course, course_version=self.version, student=self.other, mentor=self.mentor,
        )
        self.client.force_authenticate(self.mentor)
        self.error(self.patch('in_progress', instance=other.pk), 404, 'not_found')
        self.error(self.patch('in_progress', cycle=999999), 404, 'not_found')
        third = CourseNode.objects.create(
            version=self.version, parent=self.topic, kind='lesson', title='L3', position=3,
        )
        version = CourseVersion.objects.create(course=self.course, number=2, state='published')
        section = CourseNode.objects.create(version=version, kind='section', title='S', position=1)
        topic = CourseNode.objects.create(
            version=version, parent=section, kind='topic', title='T', position=1,
        )
        foreign = CourseNode.objects.create(
            version=version, parent=topic, kind='lesson', title='foreign', position=1,
        )
        self.course.current_published_version = version
        self.course.save()
        for lesson in (third, self.section, foreign):
            # Even corrupt selection rows cannot bypass kind/version checks.
            if lesson != third:
                InstanceLessonCycleLesson.objects.create(cycle_id=self.cycle, lesson=lesson)
            self.error(self.patch('in_progress', lesson=lesson.pk), 404, 'not_found')
        self.error(self.patch('in_progress', lesson=999999), 404, 'not_found')
        self.assertEqual(progress_model().objects.count(), 0)
        self.assert_progress(self.patch('in_progress'), 'in_progress', 1)
        self.assertEqual(self.entries(self.client.get(
            f'/api/instances/{other.pk}/lesson-cycles/'
        )), {})

    def test_domain_errors_preserve_detail_code_and_safe_message(self):
        self.patch('in_progress')
        response = self.patch('review', 'todo', 0)
        self.error(response, 409, 'stale_lesson_progress')
        self.assertTrue(response.json()['detail'].strip())
        self.assertEqual(response.json()['message'], response.json()['detail'])

    def test_database_constraints(self):
        model = progress_model()
        row = model.objects.create(
            instance=self.instance, lesson=self.lesson, status='in_progress', revision=1,
        )
        for kwargs in (
            {'lesson': self.lesson, 'status': 'review', 'revision': 1},
            {'lesson': self.second, 'status': 'in_progress', 'revision': 1},
            {'lesson': self.second, 'status': 'unknown', 'revision': 1},
            {'lesson': self.second, 'status': 'review', 'revision': 0},
            {'lesson': self.second, 'status': 'review', 'revision': -1},
        ):
            with self.subTest(kwargs=kwargs), self.assertRaises(IntegrityError), transaction.atomic():
                model.objects.create(instance=self.instance, **kwargs)
        # Conditional uniqueness is per instance, not global.
        other = Instance.objects.create(
            course=self.course, course_version=self.version, student=self.other,
        )
        model.objects.create(instance=other, lesson=self.lesson, status='in_progress', revision=1)
        row.status = 'review'
        row.save()
        model.objects.create(instance=self.instance, lesson=self.second, status='in_progress', revision=1)

    def test_openapi_exposes_progress_request_and_projection(self):
        schema = SchemaGenerator().get_schema(request=None, public=True)
        path = '/api/instances/{id}/lesson-cycles/{cycle_id}/lessons/{lesson_id}/progress/'
        operation = schema['paths'][path]['patch']
        request = operation['requestBody']['content']['application/json']['schema']
        if '$ref' in request:
            request = schema['components']['schemas'][request['$ref'].split('/')[-1]]
        self.assertEqual(set(request['properties']), {'status', 'expected_status', 'expected_revision'})
        self.assertEqual(set(request.get('required', [])),
                         {'status', 'expected_status', 'expected_revision'})
        self.assertTrue(operation['requestBody']['required'])
        projection = schema['components']['schemas']['LessonCycleProjection']
        self.assertIn('lesson_progress', projection['properties'])


@skipUnlessDBFeature('has_select_for_update')
class LessonProgressConcurrencyTests(ProgressFixture, TransactionTestCase):
    def setUp(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Requires PostgreSQL.')
        super().setUp()

    def race(self, callbacks, statuses, code):
        barrier = threading.Barrier(2)
        results = [None, None]

        def worker(index):
            try:
                client = APIClient()
                client.force_authenticate(self.student if index == 0 else self.mentor)
                barrier.wait(timeout=10)
                results[index] = callbacks[index](client)
            except Exception as exc:
                results[index] = exc
            finally:
                connections.close_all()

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(30)
            self.assertFalse(thread.is_alive(), 'Possible deadlock')
        self.assertTrue(all(hasattr(result, 'status_code') for result in results), results)
        actual = sorted(result.status_code for result in results)
        if isinstance(statuses, tuple):
            self.assertIn(actual, statuses)
        else:
            self.assertEqual(actual, statuses)
        for result in results:
            if result.status_code == 409:
                self.error(result, 409, code)

    def start_callback(self, lesson):
        return lambda client: client.patch(self.url(lesson=lesson), {
            'status': 'in_progress', 'expected_status': 'todo', 'expected_revision': 0,
        }, format='json')

    def test_parallel_start_same_lesson_is_stale_not_partial(self):
        self.race([self.start_callback(self.lesson.pk)] * 2, [200, 409], 'stale_lesson_progress')
        self.assertEqual(progress_model().objects.count(), 1)
        self.assert_progress(self.client.get(self.base), 'in_progress', 1)

    def test_parallel_start_different_lessons_has_one_winner(self):
        self.race([self.start_callback(lesson.pk) for lesson in (self.lesson, self.second)],
                  [200, 409], 'lesson_in_progress_exists')
        self.assertEqual(progress_model().objects.filter(status='in_progress').count(), 1)
        self.assertEqual(progress_model().objects.count(), 1)

    def test_progress_races_cycle_close_without_writing_after_close(self):
        self.race([
            self.start_callback(self.lesson.pk),
            lambda client: client.post(self.base + f'{self.cycle}/close/'),
        ], ([200, 200], [200, 409]), 'lesson_cycle_not_active')
        self.assertEqual(self.instance.lesson_cycles.get(pk=self.cycle).status, 'ended')
        before = list(progress_model().objects.values())
        self.error(self.patch('in_progress'), 409, 'lesson_cycle_not_active')
        self.assertEqual(list(progress_model().objects.values()), before)


class LessonProgressMigrationTests(TransactionTestCase):
    def test_additive_migration_preserves_selection_and_does_not_backfill_todo(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        executor.migrate([('learning', '0007_lesson_cycles')])
        try:
            old = executor.loader.project_state([('learning', '0007_lesson_cycles')]).apps
            user = old.get_model('users', 'User').objects.create(email='progress-migration@example.com')
            course = old.get_model('learning', 'Course').objects.create(owner=user, visibility='public')
            version = old.get_model('learning', 'CourseVersion').objects.create(course=course, number=1)
            instance = old.get_model('learning', 'Instance').objects.create(
                course=course, course_version=version, student=user,
            )
            node = old.get_model('learning', 'CourseNode')
            section = node.objects.create(version=version, kind='section', title='S', position=1)
            topic = node.objects.create(
                version=version, parent=section, kind='topic', title='T', position=1,
            )
            lesson = node.objects.create(
                version=version, parent=topic, kind='lesson', title='L', position=1,
            )
            cycle = old.get_model('learning', 'InstanceLessonCycle').objects.create(
                instance=instance, status='active', start_date='2026-11-08', end_date='2026-11-15',
            )
            entry = old.get_model('learning', 'InstanceLessonCycleLesson').objects.create(
                cycle=cycle, lesson=lesson,
            )
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
            new = executor.loader.project_state(latest).apps
            model = new.get_model('learning', 'InstanceLessonProgress')
            self.assertEqual(model.objects.count(), 0)
            self.assertTrue(new.get_model('learning', 'InstanceLessonCycleLesson').objects.filter(
                pk=entry.pk, cycle_id=cycle.pk, lesson_id=lesson.pk,
            ).exists())
            model.objects.create(instance_id=instance.pk, lesson_id=lesson.pk,
                                 status='in_progress', revision=1)
            with self.assertRaises(IntegrityError), transaction.atomic():
                model.objects.create(instance_id=instance.pk, lesson_id=lesson.pk,
                                     status='review', revision=1)
        finally:
            MigrationExecutor(connection).migrate(latest)
