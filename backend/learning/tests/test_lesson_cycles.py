from datetime import date
import threading

from django.db import IntegrityError, connections, transaction
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from rest_framework.test import APIClient

from learning.models import CourseNode, CourseVersion, Instance
from learning.tests.helpers import make_course, make_user


class LessonCycleFixture:
    def setUp(self):
        super().setUp()
        self.owner = make_user('lesson-owner@example.com', 'mentor')
        self.student = make_user('lesson-student@example.com', 'student')
        self.mentor = make_user('lesson-mentor@example.com', 'mentor')
        self.other = make_user('lesson-other@example.com', 'admin', 'mentor')
        self.course = make_course(self.owner)
        self.version = self.course.current_published_version
        self.instance = Instance.objects.create(
            course=self.course, course_version=self.version,
            student=self.student, mentor=self.mentor,
        )
        self.section = CourseNode.objects.create(
            version=self.version, kind='section', title='S', position=1,
        )
        self.topic = CourseNode.objects.create(
            version=self.version, kind='topic', title='T', parent=self.section, position=1,
        )
        self.lesson = CourseNode.objects.create(
            version=self.version, kind='lesson', title='L', parent=self.topic, position=1,
        )
        self.base = f'/api/instances/{self.instance.pk}/lesson-cycles/'
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def create(self, **data):
        return self.client.post(
            self.base, {'start_date': '2026-11-08', **data}, format='json',
        )

    def error(self, response, status, code):
        self.assertEqual(response.status_code, status, response.content)
        self.assertEqual(response.json()['code'], code)
        self.assertTrue(response.json()['message'].strip())

    def projection(self, response, status=200):
        self.assertEqual(response.status_code, status, response.content)
        data = response.json()
        self.assertEqual(set(data), {'active_cycle', 'planned_cycle', 'history'})
        return data

    def planned(self):
        return self.projection(self.create(), 201)['planned_cycle']['id']

    def action(self, cycle, operation, data=None):
        return self.client.post(
            self.base + f'{cycle}/{operation}/', data or {}, format='json',
        )


class LessonCycleAPITests(LessonCycleFixture, TestCase):
    def test_empty_and_default_calendar_range(self):
        self.assertEqual(self.projection(self.client.get(self.base)), {
            'active_cycle': None, 'planned_cycle': None, 'history': [],
        })
        data = self.projection(self.create(), 201)
        cycle = data['planned_cycle']
        self.assertEqual(cycle['status'], 'planned')
        self.assertEqual(cycle['start_date'], '2026-11-08')
        self.assertEqual(cycle['end_date'], '2026-11-15')
        self.assertEqual(cycle['last_day'], '2026-11-14')
        self.assertEqual(cycle['lesson_ids'], [])
        self.assertIsNone(data['active_cycle'])
        self.assertEqual(self.instance.cycles.count(), 0)
        self.assertEqual(self.instance.tasks.count(), 0)

    def test_explicit_range_and_strict_invalid_dates_are_atomic(self):
        data = self.projection(self.create(end_date='2026-11-09'), 201)
        self.assertEqual(data['planned_cycle']['last_day'], '2026-11-08')
        self.error(self.create(), 409, 'planned_lesson_cycle_exists')
        from learning.models import InstanceLessonCycle
        InstanceLessonCycle.objects.all().delete()
        invalid = [
            {}, {'start_date': None}, {'start_date': '2026-02-30'},
            {'start_date': '2026-11-08T00:00:00Z'},
            {'start_date': '20261108'}, {'start_date': '2026-1-8'},
            {'start_date': '2026-11-08', 'end_date': None},
            {'start_date': '2026-11-08', 'end_date': '2026-11-08'},
            {'start_date': '2026-11-08', 'end_date': '2026-11-07'},
            {'start_date': '9999-12-31'},
        ]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.error(self.client.post(self.base, payload, format='json'),
                           400, 'validation_error')
        self.assertEqual(InstanceLessonCycle.objects.count(), 0)

    def test_lifecycle_one_planned_and_active_explicit_no_auto_start(self):
        first = self.planned()
        self.error(self.action(first, 'close'), 409, 'lesson_cycle_not_active')
        data = self.projection(self.action(first, 'start'))
        self.assertEqual(data['active_cycle']['id'], first)
        self.assertIsNone(data['planned_cycle'])
        self.error(self.action(first, 'start'), 409, 'lesson_cycle_not_planned')
        second = self.planned()
        self.error(self.action(second, 'start'), 409, 'active_lesson_cycle_exists')
        self.error(self.create(), 409, 'planned_lesson_cycle_exists')
        data = self.projection(self.action(first, 'close'))
        self.assertIsNone(data['active_cycle'])
        self.assertEqual(data['planned_cycle']['id'], second)
        self.assertEqual(data['history'][0]['id'], first)
        self.assertEqual(data['history'][0]['status'], 'ended')
        self.error(self.action(first, 'close'), 409, 'lesson_cycle_not_active')
        self.error(self.action(first, 'start'), 409, 'lesson_cycle_not_planned')
        self.projection(self.action(second, 'start'))
        self.projection(self.action(second, 'close'))
        data = self.projection(self.client.get(self.base))
        self.assertEqual([cycle['id'] for cycle in data['history']], [second, first])

    def test_selection_only_planned_unique_and_history_preserved(self):
        cycle = self.planned()
        data = self.projection(self.action(cycle, 'lessons', {'lesson_id': self.lesson.pk}))
        self.assertEqual(data['planned_cycle']['lesson_ids'], [self.lesson.pk])
        self.error(self.action(cycle, 'lessons', {'lesson_id': self.lesson.pk}),
                   409, 'lesson_already_selected')
        self.error(self.action(cycle, 'lessons', {}), 400, 'validation_error')
        url = self.base + f'{cycle}/lessons/{self.lesson.pk}/'
        data = self.projection(self.client.delete(url))
        self.assertEqual(data['planned_cycle']['lesson_ids'], [])
        self.error(self.client.delete(url), 404, 'not_found')
        self.projection(self.action(cycle, 'lessons', {'lesson_id': self.lesson.pk}))
        data = self.projection(self.action(cycle, 'start'))
        self.assertEqual(data['active_cycle']['lesson_ids'], [self.lesson.pk])
        for ended in (False, True):
            if ended:
                self.projection(self.action(cycle, 'close'))
            self.error(self.action(cycle, 'lessons', {'lesson_id': self.lesson.pk}),
                       409, 'lesson_cycle_not_planned')
            self.error(self.client.delete(url), 409, 'lesson_cycle_not_planned')
        data = self.projection(self.client.get(self.base))
        self.assertEqual(data['history'][0]['lesson_ids'], [self.lesson.pk])

    def test_version_pinning_kind_foreign_and_missing_lesson_no_dependencies(self):
        version = CourseVersion.objects.create(course=self.course, number=2, state='published')
        self.course.current_published_version = version
        self.course.save()
        section = CourseNode.objects.create(version=version, kind='section', title='S', position=1)
        topic = CourseNode.objects.create(
            version=version, kind='topic', title='T', parent=section, position=1,
        )
        foreign = CourseNode.objects.create(
            version=version, kind='lesson', title='Foreign', parent=topic, position=1,
        )
        other_course = make_course(self.owner)
        other_version = other_course.current_published_version
        section = CourseNode.objects.create(
            version=other_version, kind='section', title='S', position=1,
        )
        topic = CourseNode.objects.create(
            version=other_version, kind='topic', title='T', parent=section, position=1,
        )
        other = CourseNode.objects.create(
            version=other_version, kind='lesson', parent=topic, title='Other', position=1,
        )
        cycle = self.planned()
        for lesson_id in (self.section.pk, self.topic.pk, foreign.pk, other.pk, 999999):
            self.error(self.action(cycle, 'lessons', {'lesson_id': lesson_id}),
                       400, 'invalid_lesson')
        from learning.models import NodePrerequisite
        prerequisite = CourseNode.objects.create(
            version=self.version, kind='lesson', title='Prerequisite',
            parent=self.topic, position=2,
        )
        NodePrerequisite.objects.create(target=self.lesson, source=prerequisite, threshold=100)
        data = self.projection(self.action(cycle, 'lessons', {'lesson_id': self.lesson.pk}))
        self.assertEqual(data['planned_cycle']['lesson_ids'], [self.lesson.pk])
        self.assertNotIn('completed', data['planned_cycle'])

    def test_student_assigned_mentor_and_stranger_all_operations(self):
        cycle = self.planned()
        for user in (self.other, self.owner):
            self.client.force_authenticate(user)
            self.error(self.client.get(self.base), 404, 'not_found')
            self.error(self.create(), 404, 'not_found')
            for operation in ('start', 'close', 'lessons'):
                self.error(self.action(cycle, operation), 404, 'not_found')
            self.error(self.client.delete(self.base + f'{cycle}/lessons/{self.lesson.pk}/'),
                       404, 'not_found')
        self.client.force_authenticate(self.mentor)
        self.projection(self.client.get(self.base))
        self.projection(self.action(cycle, 'lessons', {'lesson_id': self.lesson.pk}))
        self.projection(self.client.delete(self.base + f'{cycle}/lessons/{self.lesson.pk}/'))
        self.projection(self.action(cycle, 'start'))
        self.projection(self.create(), 201)
        self.projection(self.action(cycle, 'close'))
        self.client.force_authenticate(None)
        self.error(self.client.get(self.base), 401, 'not_authenticated')

    def test_closed_instance_read_only_for_both_participants(self):
        cycle = self.planned()
        self.instance.status = 'closed'
        self.instance.save()
        for user in (self.student, self.mentor):
            self.client.force_authenticate(user)
            data = self.projection(self.client.get(self.base))
            self.assertEqual(data['planned_cycle']['id'], cycle)
            self.error(self.create(), 409, 'instance_closed')
            for operation in ('start', 'close', 'lessons'):
                self.error(self.action(cycle, operation, {'lesson_id': self.lesson.pk}),
                           409, 'instance_closed')
            self.error(self.client.delete(self.base + f'{cycle}/lessons/{self.lesson.pk}/'),
                       409, 'instance_closed')

    def test_cycle_scoped_to_instance_and_missing_instance(self):
        cycle = self.planned()
        instance = Instance.objects.create(
            course=self.course, course_version=self.version, student=self.other,
        )
        self.client.force_authenticate(self.other)
        for operation in ('start', 'close', 'lessons'):
            url = f'/api/instances/{instance.pk}/lesson-cycles/{cycle}/{operation}/'
            self.error(self.client.post(url, {'lesson_id': self.lesson.pk}, format='json'),
                       404, 'not_found')
        self.error(self.client.delete(
            f'/api/instances/{instance.pk}/lesson-cycles/{cycle}/lessons/{self.lesson.pk}/'
        ), 404, 'not_found')
        self.error(self.client.get('/api/instances/999999/lesson-cycles/'), 404, 'not_found')

    def test_dates_do_not_transition_and_are_not_rewritten_by_start_or_close(self):
        for start, end in (('2000-01-01', '2000-01-08'), ('2099-01-01', '2099-01-08')):
            cycle = self.projection(self.create(start_date=start, end_date=end), 201)['planned_cycle']
            data = self.projection(self.client.get(self.base))
            self.assertEqual(data['planned_cycle']['status'], 'planned')
            self.projection(self.action(cycle['id'], 'start'))
            active = self.projection(self.client.get(self.base))['active_cycle']
            self.assertEqual(active['status'], 'active')
            self.assertEqual((active['start_date'], active['end_date']), (start, end))
            history = self.projection(self.action(cycle['id'], 'close'))['history'][0]
            self.assertEqual((history['start_date'], history['end_date']), (start, end))

    def test_patch_planned_dates_partial_full_and_validation_atomic(self):
        cycle = self.planned()
        url = self.base + f'{cycle}/'
        data = self.projection(self.client.patch(
            url, {'end_date': '2026-11-22'}, format='json',
        ))['planned_cycle']
        self.assertEqual((data['start_date'], data['end_date'], data['last_day']),
                         ('2026-11-08', '2026-11-22', '2026-11-21'))
        data = self.projection(self.client.patch(
            url, {'start_date': '2026-11-10'}, format='json',
        ))['planned_cycle']
        self.assertEqual((data['start_date'], data['end_date']), ('2026-11-10', '2026-11-22'))
        for payload in ({'end_date': '2026-11-10'}, {'start_date': '2026-11-23'},
                        {'end_date': None}, {'start_date': '2026-11-10T00:00:00Z'},
                        {'end_date': '2026-11-31'}):
            self.error(self.client.patch(url, payload, format='json'), 400, 'validation_error')
            data = self.projection(self.client.get(self.base))['planned_cycle']
            self.assertEqual((data['start_date'], data['end_date']), ('2026-11-10', '2026-11-22'))
        data = self.projection(self.client.patch(
            url, {'start_date': '2027-01-01', 'end_date': '2027-01-15'}, format='json',
        ))['planned_cycle']
        self.assertEqual((data['start_date'], data['end_date']), ('2027-01-01', '2027-01-15'))
        self.projection(self.client.patch(url, {}, format='json'))
        self.projection(self.action(cycle, 'start'))
        self.error(self.client.patch(url, {'end_date': '2027-01-20'}, format='json'),
                   409, 'lesson_cycle_not_planned')
        self.projection(self.action(cycle, 'close'))
        self.error(self.client.patch(url, {'end_date': '2027-01-20'}, format='json'),
                   409, 'lesson_cycle_not_planned')

    def test_patch_permissions_instance_scope_and_closed(self):
        cycle = self.planned()
        url = self.base + f'{cycle}/'
        for user in (self.other, self.owner):
            self.client.force_authenticate(user)
            self.error(self.client.patch(url, {'end_date': '2026-11-20'}, format='json'),
                       404, 'not_found')
        self.client.force_authenticate(self.mentor)
        self.projection(self.client.patch(url, {'end_date': '2026-11-20'}, format='json'))
        self.error(self.client.patch(self.base + '999999/', {}, format='json'), 404, 'not_found')
        other = Instance.objects.create(
            course=self.course, course_version=self.version, student=self.other, mentor=self.mentor,
        )
        self.error(self.client.patch(
            f'/api/instances/{other.pk}/lesson-cycles/{cycle}/', {}, format='json',
        ), 404, 'not_found')
        self.instance.status = 'closed'
        self.instance.save()
        for user in (self.student, self.mentor):
            self.client.force_authenticate(user)
            self.error(self.client.patch(url, {'end_date': '2026-11-21'}, format='json'),
                       409, 'instance_closed')


class LessonCycleConstraintTests(LessonCycleFixture, TestCase):
    def test_db_status_dates_and_conditional_uniqueness(self):
        from learning.models import InstanceLessonCycle
        for status in ('planned', 'active'):
            InstanceLessonCycle.objects.create(
                instance=self.instance, status=status,
                start_date=date(2026, 11, 8), end_date=date(2026, 11, 15),
            )
            with self.assertRaises(IntegrityError), transaction.atomic():
                InstanceLessonCycle.objects.create(
                    instance=self.instance, status=status,
                    start_date=date(2026, 11, 8), end_date=date(2026, 11, 15),
                )
        for status, end in (('unknown', date(2026, 11, 15)),
                            ('ended', date(2026, 11, 8)),
                            ('ended', date(2026, 11, 7))):
            with self.assertRaises(IntegrityError), transaction.atomic():
                InstanceLessonCycle.objects.create(
                    instance=self.instance, status=status,
                    start_date=date(2026, 11, 8), end_date=end,
                )
        for _ in range(2):
            InstanceLessonCycle.objects.create(
                instance=self.instance, status='ended',
                start_date=date(2026, 11, 8), end_date=date(2026, 11, 15),
            )

    def test_db_duplicate_lesson(self):
        from learning.models import InstanceLessonCycle, InstanceLessonCycleLesson
        cycle = InstanceLessonCycle.objects.create(
            instance=self.instance, start_date=date(2026, 11, 8), end_date=date(2026, 11, 15),
        )
        InstanceLessonCycleLesson.objects.create(cycle=cycle, lesson=self.lesson)
        with self.assertRaises(IntegrityError), transaction.atomic():
            InstanceLessonCycleLesson.objects.create(cycle=cycle, lesson=self.lesson)


@skipUnlessDBFeature('has_select_for_update')
class LessonCycleConcurrencyTests(LessonCycleFixture, TransactionTestCase):
    def race(self, url, data, statuses, method='post'):
        barrier = threading.Barrier(2)
        results = [None, None]

        def worker(index):
            try:
                client = APIClient()
                client.force_authenticate(self.student)
                barrier.wait(timeout=10)
                payload = data[index] if isinstance(data, list) else data
                results[index] = getattr(client, method)(url, payload, format='json')
            except Exception as exc:
                results[index] = exc
            finally:
                connections.close_all()

        threads = [threading.Thread(target=worker, args=(index,)) for index in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
            self.assertFalse(thread.is_alive(), 'Possible deadlock')
        self.assertTrue(all(hasattr(result, 'status_code') for result in results), results)
        self.assertEqual(sorted(result.status_code for result in results), statuses)
        for result in results:
            if result.status_code >= 400:
                self.assertTrue(result.json()['message'].strip())

    def test_concurrent_create_start_add_close(self):
        from learning.models import InstanceLessonCycle, InstanceLessonCycleLesson
        self.race(self.base, {'start_date': '2026-11-08'}, [201, 409])
        cycle = InstanceLessonCycle.objects.get(instance=self.instance)
        self.race(self.base + f'{cycle.pk}/lessons/',
                  {'lesson_id': self.lesson.pk}, [200, 409])
        self.assertEqual(InstanceLessonCycleLesson.objects.count(), 1)
        self.race(self.base + f'{cycle.pk}/start/', {}, [200, 409])
        self.assertEqual(InstanceLessonCycle.objects.filter(status='active').count(), 1)
        self.race(self.base + f'{cycle.pk}/close/', {}, [200, 409])
        self.assertEqual(InstanceLessonCycle.objects.filter(status='ended').count(), 1)

    def test_concurrent_partial_patch_validates_current_range(self):
        from learning.models import InstanceLessonCycle
        cycle = self.planned()
        # Each PATCH fits the original range, but together they are invalid.
        self.race(self.base + f'{cycle}/', [
            {'start_date': '2026-11-14'}, {'end_date': '2026-11-10'},
        ], [200, 400], method='patch')
        saved = InstanceLessonCycle.objects.get(pk=cycle)
        self.assertGreater(saved.end_date, saved.start_date)
