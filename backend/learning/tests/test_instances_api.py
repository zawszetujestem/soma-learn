from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import Instance, InstanceTask
from learning.tests.helpers import make_course, make_user


class InstancesApiTests(TestCase):
    def setUp(self):
        self.mentor = make_user('mentor@example.com', 'mentor')
        self.other_mentor = make_user('other@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.stranger = make_user('stranger@example.com', 'student')
        self.course = make_course(self.mentor)
        self.instance = Instance.objects.create(course=self.course, student=self.student, mentor=self.mentor)
        self.task_a = self.instance.tasks.create(title='A', hours=Decimal('1.00'))
        self.task_b = self.instance.tasks.create(title='B', hours=Decimal('1.00'))
        self.client = APIClient()

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def status_url(self, task=None):
        return f'/api/instances/{self.instance.pk}/tasks/{(task or self.task_a).pk}/'

    def test_list_contains_own_instances_for_student_and_mentor(self):
        self.as_user(self.student)
        self.assertEqual([i['id'] for i in self.client.get('/api/instances/').data], [self.instance.pk])
        self.as_user(self.mentor)
        self.assertEqual([i['id'] for i in self.client.get('/api/instances/').data], [self.instance.pk])
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.get('/api/instances/').data, [])

    def test_detail_for_student_contains_progress_as_float(self):
        self.as_user(self.student)
        response = self.client.get(f'/api/instances/{self.instance.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['progress'], 0.0)
        self.assertEqual(len(response.data['tasks']), 2)
        self.assertEqual(response.data['tasks'][0]['hours'], '1.00')

    def test_student_with_mentor_can_read_detail(self):
        self.as_user(self.student)
        self.assertEqual(self.client.get(f'/api/instances/{self.instance.pk}/').status_code, 200)

    def test_stranger_and_other_mentor_get_not_found(self):
        self.as_user(self.stranger)
        self.assertEqual(self.client.get(f'/api/instances/{self.instance.pk}/').status_code, 404)
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.get(f'/api/instances/{self.instance.pk}/').status_code, 404)

    def test_instance_patch_is_not_allowed(self):
        self.as_user(self.mentor)
        response = self.client.patch(f'/api/instances/{self.instance.pk}/', {'status': 'closed'}, format='json')
        self.assertEqual(response.status_code, 405)

    def test_student_without_mentor_updates_task_status_and_progress(self):
        solo_course = make_course(self.mentor, title='Solo')
        solo = Instance.objects.create(course=solo_course, student=self.stranger, mentor=None)
        t1 = solo.tasks.create(title='X', hours=Decimal('1.00'))
        solo.tasks.create(title='Y', hours=Decimal('1.00'))
        self.as_user(self.stranger)
        response = self.client.patch(f'/api/instances/{solo.pk}/tasks/{t1.pk}/', {
            'status': 'done', 'progress': 99,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'done')
        t1.refresh_from_db()
        self.assertEqual(t1.status, InstanceTask.Status.DONE)
        detail = self.client.get(f'/api/instances/{solo.pk}/')
        self.assertEqual(detail.data['progress'], 50.0)

    def test_student_with_mentor_cannot_update_task_status(self):
        self.as_user(self.student)
        response = self.client.patch(self.status_url(), {'status': 'done'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_mentor_updates_task_status(self):
        self.as_user(self.mentor)
        response = self.client.patch(self.status_url(), {'status': 'in_progress'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.task_a.refresh_from_db()
        self.assertEqual(self.task_a.status, InstanceTask.Status.IN_PROGRESS)

    def test_invalid_task_status_is_bad_request(self):
        self.as_user(self.mentor)
        response = self.client.patch(self.status_url(), {'status': 'nope'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_progress_reflects_done_hours(self):
        self.as_user(self.mentor)
        self.client.patch(self.status_url(), {'status': 'done'}, format='json')
        detail = self.client.get(f'/api/instances/{self.instance.pk}/')
        self.assertEqual(detail.data['progress'], 50.0)

    def test_closed_instance_task_change_gives_conflict(self):
        self.as_user(self.mentor)
        self.client.post(f'/api/instances/{self.instance.pk}/close/')
        response = self.client.patch(self.status_url(), {'status': 'done'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'instance_closed')
        self.task_a.refresh_from_db()
        self.assertEqual(self.task_a.status, InstanceTask.Status.TODO)

    def test_mentor_closes_and_second_close_conflicts(self):
        self.as_user(self.mentor)
        response = self.client.post(f'/api/instances/{self.instance.pk}/close/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'closed')
        self.assertIsNotNone(response.data['closed_at'])
        again = self.client.post(f'/api/instances/{self.instance.pk}/close/')
        self.assertEqual(again.status_code, 409)
        self.assertEqual(again.data['code'], 'already_closed')

    def test_student_with_mentor_cannot_close(self):
        self.as_user(self.student)
        self.assertEqual(self.client.post(f'/api/instances/{self.instance.pk}/close/').status_code, 403)

    def test_stranger_cannot_close(self):
        self.as_user(self.stranger)
        self.assertEqual(self.client.post(f'/api/instances/{self.instance.pk}/close/').status_code, 404)

    def test_mentor_resumes_own_closed_instance_with_same_id_and_tasks(self):
        self.as_user(self.mentor)
        self.client.post(f'/api/instances/{self.instance.pk}/close/')
        response = self.client.post(f'/api/instances/{self.instance.pk}/resume/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.instance.pk)
        self.assertEqual(response.data['status'], 'active')
        self.assertIsNone(response.data['closed_at'])
        self.assertEqual(len(response.data['tasks']), 2)

    def test_student_with_mentor_cannot_resume(self):
        self.as_user(self.mentor)
        self.client.post(f'/api/instances/{self.instance.pk}/close/')
        self.as_user(self.student)
        self.assertEqual(self.client.post(f'/api/instances/{self.instance.pk}/resume/').status_code, 403)

    def test_resume_of_active_instance_conflicts(self):
        self.as_user(self.mentor)
        response = self.client.post(f'/api/instances/{self.instance.pk}/resume/')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'already_active')
