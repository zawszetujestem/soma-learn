from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import Course, Instance
from learning.tests.helpers import make_course, make_user


class JoinApiTests(TestCase):
    def setUp(self):
        self.mentor = make_user('mentor@example.com', 'mentor')
        self.other_mentor = make_user('other@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.course = make_course(self.mentor)
        self.client = APIClient()

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def test_student_joins_public_course_with_201_then_200(self):
        self.as_user(self.student)
        first = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data['mentor'], self.mentor.pk)
        second = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data['id'], first.data['id'])
        self.assertEqual(Instance.objects.count(), 1)

    def test_join_copies_course_tasks(self):
        from decimal import Decimal
        from learning.models import CourseTask
        CourseTask.objects.create(course=self.course, title='Lekcja', hours=Decimal('2.00'))
        self.as_user(self.student)
        response = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(response.status_code, 201)
        self.assertEqual([t['title'] for t in response.data['tasks']], ['Lekcja'])

    def test_second_active_course_gives_slot_taken(self):
        other = make_course(self.mentor, title='Drugi')
        Instance.objects.create(course=other, student=self.student, mentor=self.mentor)
        self.as_user(self.student)
        response = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'slot_taken')

    def test_mentor_without_student_role_cannot_join_others_course(self):
        self.as_user(self.other_mentor)
        response = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Instance.objects.exists())

    def test_other_mentor_gets_not_found_for_pending_course(self):
        pending = make_course(self.mentor, title='Oczekujacy', status=Course.ApprovalStatus.PENDING)
        self.as_user(self.other_mentor)
        response = self.client.post(f'/api/courses/{pending.pk}/join/')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(Instance.objects.exists())

    def test_other_mentor_gets_not_found_for_rejected_course(self):
        rejected = make_course(self.mentor, title='Odrzucony', status=Course.ApprovalStatus.REJECTED)
        self.as_user(self.other_mentor)
        response = self.client.post(f'/api/courses/{rejected.pk}/join/')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(Instance.objects.exists())

    def test_other_mentor_gets_not_found_for_private_course_without_token(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        self.as_user(self.other_mentor)
        response = self.client.post(f'/api/courses/{private.pk}/join/')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(Instance.objects.exists())

    def test_other_mentor_gets_forbidden_for_visible_approved_public_course(self):
        self.as_user(self.other_mentor)
        response = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Instance.objects.exists())

    def test_owner_joins_own_course_as_preview_without_mentor(self):
        self.as_user(self.mentor)
        response = self.client.post(f'/api/courses/{self.course.pk}/join/')
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data['mentor'])

    def test_owner_of_pending_course_gets_course_not_approved(self):
        pending = make_course(self.mentor, title='Oczekujacy', status=Course.ApprovalStatus.PENDING)
        self.as_user(self.mentor)
        response = self.client.post(f'/api/courses/{pending.pk}/join/')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'course_not_approved')

    def test_pending_course_is_not_found_for_student(self):
        pending = make_course(self.mentor, title='Oczekujacy', status=Course.ApprovalStatus.PENDING)
        self.as_user(self.student)
        self.assertEqual(self.client.post(f'/api/courses/{pending.pk}/join/').status_code, 404)

    def test_inactive_course_gives_course_inactive(self):
        inactive = make_course(self.mentor, title='Nieaktywny', active=False)
        self.as_user(self.student)
        response = self.client.post(f'/api/courses/{inactive.pk}/join/')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'course_inactive')

    def test_private_course_cannot_be_joined_by_id(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        self.as_user(self.student)
        self.assertEqual(self.client.post(f'/api/courses/{private.pk}/join/').status_code, 404)

    def test_student_joins_private_course_by_token(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        self.as_user(self.student)
        response = self.client.post(f'/api/courses/join/{private.invite_token}/')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['course'], private.pk)

    def test_invalid_token_is_not_found(self):
        self.as_user(self.student)
        self.assertEqual(self.client.post('/api/courses/join/zly-token/').status_code, 404)

    def test_other_mentor_gets_forbidden_with_valid_token_for_private_course(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        self.as_user(self.other_mentor)
        response = self.client.post(f'/api/courses/join/{private.invite_token}/')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Instance.objects.exists())

    def test_other_mentor_gets_not_found_for_inactive_public_course(self):
        inactive = make_course(self.mentor, title='Nieaktywny', active=False)
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.post(f'/api/courses/{inactive.pk}/join/').status_code, 404)
        self.assertFalse(Instance.objects.exists())

    def test_other_mentor_gets_not_found_with_valid_token_for_inactive_private_course(self):
        private = make_course(self.mentor, visibility=Course.Visibility.PRIVATE, active=False, title='Prywatny')
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.post(f'/api/courses/join/{private.invite_token}/').status_code, 404)
        self.assertFalse(Instance.objects.exists())

    def test_token_join_without_role_is_not_found_for_invalid_token(self):
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.post('/api/courses/join/zly-token/').status_code, 404)

    def test_join_by_missing_course_without_role_is_not_found(self):
        self.as_user(self.other_mentor)
        self.assertEqual(self.client.post('/api/courses/999999/join/').status_code, 404)
