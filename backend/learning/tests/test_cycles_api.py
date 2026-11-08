from django.test import TestCase
from rest_framework.test import APIClient

from learning import services
from learning.models import CourseVersion, Instance, InstanceTask
from learning.tests.helpers import make_course, make_user


class CycleApiTests(TestCase):
    def setUp(self):
        self.owner = make_user('cycle-owner@example.com', 'mentor')
        self.student = make_user('cycle-student@example.com', 'student')
        self.other = make_user('cycle-other@example.com', 'student')
        self.course = make_course(self.owner)
        self.a = self.course.tasks.create(title='A', hours=1)
        self.b = self.course.tasks.create(title='B', hours=1)
        self.c = self.course.tasks.create(title='C', hours=1)
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def join(self):
        response = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(response.status_code, 201)
        self.instance = Instance.objects.get(pk=response.data['id'])
        self.tasks = list(self.instance.tasks.all())
        self.base = f'/api/instances/{self.instance.pk}/'
        return response.data

    def patch(self, task, **changes):
        return self.client.patch(self.base + f'tasks/{task.pk}/', changes, format='json')

    def detail(self):
        return self.client.get(self.base).data

    def dependencies(self, task, ids):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            f'/api/courses/{self.course.pk}/tasks/{task.pk}/',
            {'prerequisite_ids': ids}, format='json',
        )
        self.client.force_authenticate(self.student)
        return response

    def assert_error(self, response, status, code=None):
        self.assertEqual(response.status_code, status)
        self.assertTrue(str(response.data['message']).strip())
        if code:
            self.assertEqual(response.data['code'], code)
            self.assertIn('detail', response.data)

    def test_multiple_courses_and_same_course_idempotent(self):
        first = self.join()
        second = make_course(self.owner, title='Second')
        response = self.client.post(f'/api/courses/{second.pk}/join/')
        self.assertEqual(response.status_code, 201)
        again = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data['id'], first['id'])
        self.assertEqual(Instance.objects.filter(student=self.student, status='active').count(), 2)

    def test_prerequisites_serialized_and_snapshot_not_changed_by_author_or_versions(self):
        self.assertEqual(self.dependencies(self.c, [self.a.pk, self.b.pk]).status_code, 200)
        data = self.join()
        self.assertEqual(data['tasks'][2]['prerequisite_ids'], [self.tasks[0].pk, self.tasks[1].pk])
        self.assertTrue(data['tasks'][2]['blocked'])
        self.assertEqual(self.dependencies(self.c, []).status_code, 200)
        version = CourseVersion.objects.create(course=self.course, number=2, state='published', title='New')
        self.course.current_published_version = version
        self.course.save()
        detail = self.detail()
        self.assertEqual(detail['course_title'], 'Kurs testowy')
        self.assertEqual(detail['course_version'], self.instance.course_version_id)
        self.assertEqual(detail['tasks'][2]['prerequisite_ids'], data['tasks'][2]['prerequisite_ids'])
        new_instance, _ = services.join_course(self.other, course_id=self.course.pk)
        self.assertEqual(new_instance.tasks.last().prerequisites.count(), 0)

    def test_graph_self_foreign_missing_and_circular_errors_are_safe_and_atomic(self):
        self.assert_error(self.dependencies(self.a, [self.a.pk]), 400, 'invalid_prerequisite')
        foreign = make_course(self.owner).tasks.create(title='Foreign', hours=1)
        self.assert_error(self.dependencies(self.a, [foreign.pk]), 400, 'invalid_prerequisite')
        self.assert_error(self.dependencies(self.a, [999999]), 400, 'invalid_prerequisite')
        self.assertEqual(self.dependencies(self.b, [self.a.pk]).status_code, 200)
        self.assertEqual(self.dependencies(self.c, [self.b.pk]).status_code, 200)
        self.assert_error(self.dependencies(self.a, [self.c.pk]), 400, 'invalid_prerequisite')
        self.assertEqual(self.a.prerequisites.count(), 0)

    def test_author_create_dependencies_and_unauthorized_edit(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            f'/api/courses/{self.course.pk}/tasks/',
            {'title': 'D', 'hours': 1, 'prerequisite_ids': [self.a.pk]}, format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['prerequisite_ids'], [self.a.pk])
        self.client.force_authenticate(self.student)
        response = self.client.patch(
            f'/api/courses/{self.course.pk}/tasks/{self.a.pk}/',
            {'prerequisite_ids': []}, format='json',
        )
        self.assert_error(response, 403)

    def test_all_prerequisites_done_gates_select_and_status_without_auto_select(self):
        self.dependencies(self.c, [self.a.pk, self.b.pk])
        self.join()
        a, b, c = self.tasks
        self.assert_error(self.patch(a, selected=True), 409, 'no_active_cycle')
        self.assertEqual(self.client.post(self.base + 'cycles/').status_code, 201)
        self.assert_error(self.patch(c, selected=True), 409, 'task_blocked')
        self.assert_error(self.patch(c, status='done'), 409, 'task_blocked')
        self.assertEqual(self.patch(a, status='done').status_code, 200)
        self.assertTrue(self.detail()['tasks'][2]['blocked'])
        self.assertEqual(self.patch(b, status='done').status_code, 200)
        self.assertFalse(self.detail()['tasks'][2]['blocked'])
        self.assertFalse(self.detail()['tasks'][2]['selected'])
        self.assertEqual(self.patch(c, selected=True).status_code, 200)
        self.assertTrue(self.detail()['tasks'][2]['selected'])

    def test_reopening_ejects_unfinished_dependents_preserving_progress_and_done(self):
        self.dependencies(self.b, [self.a.pk])
        self.dependencies(self.c, [self.b.pk])
        self.join()
        a, b, c = self.tasks
        self.client.post(self.base + 'cycles/')
        self.patch(a, status='done', selected=True)
        self.patch(b, status='done', selected=True)
        self.patch(c, status='in_progress', selected=True)
        self.patch(a, status='todo')
        data = self.detail()
        # Completed B is not erased or blocked; C still has its Done prerequisite.
        self.assertEqual(data['tasks'][1]['status'], 'done')
        self.assertTrue(data['tasks'][2]['selected'])
        self.patch(a, status='done')
        self.patch(b, status='in_progress')
        data = self.detail()
        self.assertTrue(data['tasks'][2]['blocked'])
        self.assertFalse(data['tasks'][2]['selected'])
        self.assertEqual(data['tasks'][2]['status'], 'in_progress')
        self.patch(b, status='done')
        self.assertFalse(self.detail()['tasks'][2]['selected'])

    def test_reopening_direct_prerequisite_reblocks_only_unfinished(self):
        self.dependencies(self.b, [self.a.pk])
        self.dependencies(self.c, [self.a.pk])
        self.join()
        a, b, c = self.tasks
        self.client.post(self.base + 'cycles/')
        self.patch(a, status='done')
        self.patch(b, status='in_progress', selected=True)
        self.patch(c, status='done', selected=True)
        self.patch(a, status='in_progress')
        data = self.detail()
        self.assertTrue(data['tasks'][1]['blocked'])
        self.assertFalse(data['tasks'][1]['selected'])
        self.assertEqual(data['tasks'][1]['status'], 'in_progress')
        self.assertEqual(data['tasks'][2]['status'], 'done')
        self.assertFalse(data['tasks'][2]['blocked'])
        self.assertTrue(data['tasks'][2]['selected'])

    def test_cycle_end_keeps_status_and_immutable_history_then_new_cycle(self):
        self.join()
        cycle = self.client.post(self.base + 'cycles/').data['active_cycle']
        self.patch(self.tasks[0], status='in_progress', selected=True)
        self.patch(self.tasks[1], status='done', selected=True)
        response = self.client.post(self.base + f'cycles/{cycle["id"]}/close/')
        self.assertEqual(response.status_code, 200)
        data = self.detail()
        self.assertIsNone(data['active_cycle'])
        self.assertFalse(any(t['selected'] for t in data['tasks']))
        self.assertEqual(data['tasks'][0]['status'], 'in_progress')
        self.assertEqual([t['status'] for t in data['cycle_history'][0]['tasks']], ['in_progress', 'done'])
        self.client.post(self.base + 'cycles/')
        self.patch(self.tasks[0], status='done', selected=True)
        self.assertEqual(self.detail()['cycle_history'][0]['tasks'][0]['status'], 'in_progress')

    def test_one_active_cycle_per_instance_but_independent_courses(self):
        self.join()
        self.assertEqual(self.client.post(self.base + 'cycles/').status_code, 201)
        self.assert_error(self.client.post(self.base + 'cycles/'), 409, 'cycle_already_active')
        other_course = make_course(self.owner)
        other, _ = services.join_course(self.student, course_id=other_course.pk)
        self.assertEqual(self.client.post(f'/api/instances/{other.pk}/cycles/').status_code, 201)

    def test_complete_incomplete_with_mentor_closes_cycle_resumes_same_snapshot_periods(self):
        self.join()
        self.client.post(self.base + 'cycles/')
        self.patch(self.tasks[0], status='in_progress', selected=True)
        response = self.client.post(self.base + 'close/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'closed')
        self.assertIsNone(response.data['active_cycle'])
        self.assertEqual(len(response.data['cycle_history']), 1)
        self.assert_error(self.patch(self.tasks[0], selected=True), 409, 'instance_closed')
        self.assert_error(self.client.post(self.base + 'cycles/'), 409, 'instance_closed')
        response = self.client.post(self.base + 'resume/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.instance.pk)
        self.assertIsNone(response.data['active_cycle'])
        self.assertEqual(response.data['tasks'][0]['status'], 'in_progress')
        self.assertEqual(self.instance.periods.count(), 2)
        self.assertEqual(self.instance.periods.filter(ended_at__isnull=False).count(), 1)

    def test_dashboard_only_own_learner_instances_and_pinned_titles(self):
        self.join()
        other_course = make_course(self.owner, title='Mentored only')
        other = Instance.objects.create(course=other_course, course_version=other_course.versions.first(),
                                        student=self.other, mentor=self.student)
        response = self.client.get('/api/instances/mine/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([i['id'] for i in response.data], [self.instance.pk])
        self.assertEqual(response.data[0]['course_title'], 'Kurs testowy')
        self.assertIn(other.pk, [i['id'] for i in self.client.get('/api/instances/').data])
        self.client.post(self.base + 'close/')
        self.assertEqual(self.client.get('/api/instances/mine/').data[0]['status'], 'closed')

    def test_foreign_instance_task_and_cycle_and_anonymous_errors(self):
        self.join()
        cycle = self.client.post(self.base + 'cycles/').data['active_cycle']
        other_course = make_course(self.owner)
        other, _ = services.join_course(self.other, course_id=other_course.pk)
        self.assert_error(self.client.post(f'/api/instances/{other.pk}/cycles/{cycle["id"]}/close/'), 404)
        self.client.force_authenticate(self.other)
        self.assert_error(self.client.post(self.base + 'cycles/'), 404)
        self.assert_error(self.patch(self.tasks[0], status='done'), 404)
        self.client.force_authenticate(None)
        self.assert_error(self.client.get('/api/instances/mine/'), 401)

    def test_bad_cycle_close_and_invalid_patch_errors(self):
        self.join()
        self.assert_error(self.client.post(self.base + 'cycles/99999/close/'), 404)
        self.assert_error(self.patch(self.tasks[0], selected='nonsense'), 400)
        self.assert_error(self.patch(self.tasks[0]), 400)
        cycle = self.client.post(self.base + 'cycles/').data['active_cycle']
        self.client.post(self.base + f'cycles/{cycle["id"]}/close/')
        self.assert_error(self.client.post(self.base + f'cycles/{cycle["id"]}/close/'), 409, 'cycle_not_active')

    def test_mentor_keeps_cycle_and_task_permissions(self):
        self.join()
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(self.base + 'cycles/').status_code, 201)
        self.assertEqual(self.patch(self.tasks[0], selected=True, status='done').status_code, 200)
