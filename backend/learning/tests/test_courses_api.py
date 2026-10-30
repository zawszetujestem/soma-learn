from decimal import Decimal

from rest_framework.test import APIClient
from django.test import TestCase

from learning.models import Course, CourseTask, Instance, InstanceTask
from learning.tests.helpers import make_course, make_user


class CoursesApiTests(TestCase):
    def setUp(self):
        self.mentor = make_user('mentor@example.com', 'mentor')
        self.other_mentor = make_user('other@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.admin = make_user('admin@example.com', 'admin')
        self.client = APIClient()

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def test_all_endpoints_require_authentication(self):
        course = make_course(self.mentor)
        urls = [
            ('get', '/api/courses/'),
            ('post', '/api/courses/'),
            ('get', '/api/courses/mine/'),
            ('get', f'/api/courses/mine/{course.pk}/'),
            ('get', f'/api/courses/mine/{course.pk}/students-count/'),
            ('get', f'/api/courses/{course.pk}/'),
            ('patch', f'/api/courses/{course.pk}/'),
            ('post', f'/api/courses/{course.pk}/resubmit/'),
            ('post', f'/api/courses/{course.pk}/regenerate-token/'),
            ('post', f'/api/courses/{course.pk}/join/'),
            ('post', '/api/courses/join/some-token/'),
            ('get', '/api/instances/'),
        ]
        for method, url in urls:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(response.status_code, 401)

    def test_mentor_creates_public_course_as_pending(self):
        self.as_user(self.mentor)
        response = self.client.post('/api/courses/', {
            'title': 'Python', 'description': 'Opis', 'visibility': 'public',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['approval_status'], 'pending')
        self.assertEqual(response.data['owner'], self.mentor.pk)
        self.assertNotIn('invite_token', response.data)

    def test_mentor_cannot_self_approve_by_sending_approval_status(self):
        self.as_user(self.mentor)
        response = self.client.post('/api/courses/', {
            'title': 'Python', 'description': 'Opis', 'visibility': 'public', 'approval_status': 'approved',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['approval_status'], 'pending')

    def test_admin_creates_public_course_as_approved(self):
        self.as_user(self.admin)
        response = self.client.post('/api/courses/', {
            'title': 'Admin', 'description': '', 'visibility': 'public',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['approval_status'], 'approved')
        self.assertEqual(response.data['owner'], self.admin.pk)

    def test_admin_cannot_create_private_course(self):
        self.as_user(self.admin)
        response = self.client.post('/api/courses/', {
            'title': 'Prywatny', 'description': '', 'visibility': 'private',
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Course.objects.exists())

    def test_mentor_private_course_is_approved_with_token(self):
        self.as_user(self.mentor)
        response = self.client.post('/api/courses/', {
            'title': 'Prywatny', 'description': '', 'visibility': 'private',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['approval_status'], 'approved')
        self.assertTrue(response.data['invite_token'])

    def test_student_cannot_create_course(self):
        self.as_user(self.student)
        response = self.client.post('/api/courses/', {
            'title': 'Nie', 'description': '', 'visibility': 'public',
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Course.objects.exists())

    def test_create_validates_title(self):
        self.as_user(self.mentor)
        response = self.client.post('/api/courses/', {'title': '', 'visibility': 'public'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)

    def test_list_returns_only_public_approved_active_courses(self):
        visible = make_course(self.mentor, title='Widoczny')
        make_course(self.mentor, title='Oczekuje', status=Course.ApprovalStatus.PENDING)
        make_course(self.mentor, title='Nieaktywny', active=False)
        make_course(self.mentor, title='Prywatny', visibility=Course.Visibility.PRIVATE)
        self.as_user(self.student)
        response = self.client.get('/api/courses/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([c['id'] for c in response.data], [visible.pk])
        self.assertNotIn('invite_token', response.data[0])

    def test_detail_hides_unapproved_course_from_others(self):
        pending = make_course(self.mentor, status=Course.ApprovalStatus.PENDING)
        self.as_user(self.student)
        self.assertEqual(self.client.get(f'/api/courses/{pending.pk}/').status_code, 404)

    def test_owner_sees_own_pending_course_without_student_role(self):
        pending = make_course(self.mentor, status=Course.ApprovalStatus.PENDING)
        self.as_user(self.mentor)
        self.assertEqual(self.client.get(f'/api/courses/{pending.pk}/').status_code, 200)

    def test_private_course_detail_hidden_without_instance(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        self.as_user(self.student)
        self.assertEqual(self.client.get(f'/api/courses/{private.pk}/').status_code, 404)

    def test_private_course_detail_visible_to_its_student(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        Instance.objects.create(course=private, student=self.student, mentor=self.mentor)
        self.as_user(self.student)
        response = self.client.get(f'/api/courses/{private.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('invite_token', response.data)

    def test_mine_lists_only_own_courses_for_mentor(self):
        mine = make_course(self.mentor, title='Moj')
        make_course(self.other_mentor, title='Cudzy')
        self.as_user(self.mentor)
        response = self.client.get('/api/courses/mine/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([c['id'] for c in response.data], [mine.pk])

    def test_mine_is_forbidden_for_student(self):
        self.as_user(self.student)
        self.assertEqual(self.client.get('/api/courses/mine/').status_code, 403)

    def test_mine_detail_contains_token_for_owner(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        self.as_user(self.mentor)
        response = self.client.get(f'/api/courses/mine/{private.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['invite_token'], private.invite_token)

    def test_mine_detail_hidden_from_other_mentor(self):
        course = make_course(self.mentor)
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.get(f'/api/courses/mine/{course.pk}/').status_code, 404)

    def test_owner_patch_content_of_approved_public_course_returns_it_to_pending(self):
        course = make_course(self.mentor)
        self.as_user(self.mentor)
        response = self.client.patch(f'/api/courses/{course.pk}/', {'title': 'Nowy'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['approval_status'], 'pending')

    def test_owner_patch_is_active_keeps_approval(self):
        course = make_course(self.mentor)
        self.as_user(self.mentor)
        response = self.client.patch(f'/api/courses/{course.pk}/', {'is_active': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['approval_status'], 'approved')
        self.assertFalse(response.data['is_active'])

    def test_patch_visibility_is_rejected(self):
        course = make_course(self.mentor)
        self.as_user(self.mentor)
        response = self.client.patch(f'/api/courses/{course.pk}/', {'visibility': 'private'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('visibility', response.data)
        course.refresh_from_db()
        self.assertEqual(course.visibility, Course.Visibility.PUBLIC)

    def test_patch_by_non_owner_mentor_is_not_found(self):
        course = make_course(self.mentor)
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.patch(f'/api/courses/{course.pk}/', {'title': 'X'}, format='json').status_code, 404)

    def test_patch_by_student_is_forbidden(self):
        course = make_course(self.mentor)
        self.as_user(self.student)
        self.assertEqual(self.client.patch(f'/api/courses/{course.pk}/', {'title': 'X'}, format='json').status_code, 403)

    def test_reactivation_keeps_invite_token(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        token = private.invite_token
        self.as_user(self.mentor)
        self.client.patch(f'/api/courses/{private.pk}/', {'is_active': False}, format='json')
        self.client.patch(f'/api/courses/{private.pk}/', {'is_active': True}, format='json')
        private.refresh_from_db()
        self.assertEqual(private.invite_token, token)
        self.assertTrue(private.is_active)

    def test_resubmit_rejected_course(self):
        rejected = make_course(self.mentor, status=Course.ApprovalStatus.REJECTED)
        self.as_user(self.mentor)
        response = self.client.post(f'/api/courses/{rejected.pk}/resubmit/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['approval_status'], 'pending')

    def test_resubmit_approved_course_gives_conflict(self):
        course = make_course(self.mentor)
        self.as_user(self.mentor)
        response = self.client.post(f'/api/courses/{course.pk}/resubmit/')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'course_not_rejected')

    def test_resubmit_by_non_owner_is_not_found(self):
        rejected = make_course(self.mentor, status=Course.ApprovalStatus.REJECTED)
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.post(f'/api/courses/{rejected.pk}/resubmit/').status_code, 404)

    def test_regenerate_token_returns_new_token(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        old = private.invite_token
        self.as_user(self.mentor)
        response = self.client.post(f'/api/courses/{private.pk}/regenerate-token/')
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.data['invite_token'], old)

    def test_regenerate_token_on_public_course_conflicts(self):
        course = make_course(self.mentor)
        self.as_user(self.mentor)
        response = self.client.post(f'/api/courses/{course.pk}/regenerate-token/')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'course_not_private')

    def test_students_count_counts_only_active_instances_of_this_mentor(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        s2 = make_user('s2@example.com', 'student')
        s3 = make_user('s3@example.com', 'student')
        Instance.objects.create(course=private, student=self.student, mentor=self.mentor)
        Instance.objects.create(course=private, student=s2, mentor=self.mentor, status=Instance.Status.CLOSED)
        Instance.objects.create(course=private, student=s3, mentor=None)
        self.as_user(self.mentor)
        response = self.client.get(f'/api/courses/mine/{private.pk}/students-count/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_students_count_forbidden_for_non_owner(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE)
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.get(f'/api/courses/mine/{private.pk}/students-count/').status_code, 404)


class CourseTasksApiTests(TestCase):
    def setUp(self):
        self.mentor = make_user('mentor@example.com', 'mentor')
        self.other_mentor = make_user('other@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.course = make_course(self.mentor)
        self.client = APIClient()
        self.client.force_authenticate(user=self.mentor)

    def test_owner_adds_task_to_approved_public_course_returns_it_to_pending(self):
        response = self.client.post(f'/api/courses/{self.course.pk}/tasks/', {
            'title': 'Lekcja', 'hours': '2.50', 'position': 1,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.course.refresh_from_db()
        self.assertEqual(self.course.approval_status, Course.ApprovalStatus.PENDING)

    def test_owner_deletes_task_of_approved_public_course_returns_it_to_pending(self):
        task = CourseTask.objects.create(course=self.course, title='Stare', hours=Decimal('1.00'))
        self.assertEqual(self.client.delete(f'/api/courses/{self.course.pk}/tasks/{task.pk}/').status_code, 204)
        self.course.refresh_from_db()
        self.assertEqual(self.course.approval_status, Course.ApprovalStatus.PENDING)

    def test_owner_adds_task(self):
        response = self.client.post(f'/api/courses/{self.course.pk}/tasks/', {
            'title': 'Lekcja', 'hours': '2.50', 'position': 1,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['hours'], '2.50')
        self.assertTrue(CourseTask.objects.filter(course=self.course, title='Lekcja').exists())

    def test_task_hours_must_be_positive_with_two_decimals(self):
        for hours in ('0', '-1', '1.555'):
            with self.subTest(hours=hours):
                response = self.client.post(f'/api/courses/{self.course.pk}/tasks/', {
                    'title': 'Zla', 'hours': hours,
                }, format='json')
                self.assertEqual(response.status_code, 400)
                self.assertIn('hours', response.data)

    def test_owner_updates_and_deletes_task(self):
        task = CourseTask.objects.create(course=self.course, title='Stare', hours=Decimal('1.00'))
        response = self.client.patch(f'/api/courses/{self.course.pk}/tasks/{task.pk}/', {
            'title': 'Nowe', 'hours': '3.00',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.title, 'Nowe')
        response = self.client.delete(f'/api/courses/{self.course.pk}/tasks/{task.pk}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(CourseTask.objects.filter(pk=task.pk).exists())

    def test_non_owner_mentor_gets_not_found(self):
        self.client.force_authenticate(user=self.other_mentor)
        response = self.client.post(f'/api/courses/{self.course.pk}/tasks/', {
            'title': 'Obca', 'hours': '1',
        }, format='json')
        self.assertEqual(response.status_code, 404)

    def test_student_gets_forbidden(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/courses/{self.course.pk}/tasks/', {
            'title': 'Uczen', 'hours': '1',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_task_of_other_course_is_not_found(self):
        other = make_course(self.mentor, title='Inny')
        task = CourseTask.objects.create(course=other, title='Obcy', hours=Decimal('1'))
        response = self.client.delete(f'/api/courses/{self.course.pk}/tasks/{task.pk}/')
        self.assertEqual(response.status_code, 404)
        self.assertTrue(CourseTask.objects.filter(pk=task.pk).exists())
