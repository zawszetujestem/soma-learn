from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from learning.models import Course
from learning.tests.helpers import make_course, make_user


class CourseAdminTests(TestCase):
    def setUp(self):
        self.staff = make_user('admin@example.com', 'admin')
        self.staff.is_staff = True
        self.staff.is_superuser = True
        self.staff.save()
        self.client.force_login(self.staff)
        self.owner = make_user('mentor@example.com', 'mentor')

    def change_course(self, course, status):
        url = reverse('admin:learning_course_change', args=[course.pk])
        return self.client.post(url, {
            'owner': self.owner.pk,
            'title': course.title,
            'description': course.description,
            'approval_status': status,
            'is_active': 'on',
        })

    def test_course_is_registered_in_admin(self):
        self.assertIn(Course, admin.site._registry)

    def test_pending_course_can_be_approved(self):
        course = make_course(self.owner, status=Course.ApprovalStatus.PENDING)
        response = self.change_course(course, Course.ApprovalStatus.APPROVED)
        self.assertEqual(response.status_code, 302)
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.APPROVED)

    def test_pending_course_can_be_rejected(self):
        course = make_course(self.owner, status=Course.ApprovalStatus.PENDING)
        response = self.change_course(course, Course.ApprovalStatus.REJECTED)
        self.assertEqual(response.status_code, 302)
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.REJECTED)

    def test_approved_course_cannot_be_rejected_in_admin(self):
        course = make_course(self.owner)
        response = self.change_course(course, Course.ApprovalStatus.REJECTED)
        self.assertEqual(response.status_code, 200)
        self.assertIn('approval_status', response.context['adminform'].form.errors)
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.APPROVED)
