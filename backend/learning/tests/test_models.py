from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from learning.models import Course, CourseTask, Instance
from learning.tests.helpers import make_course, make_user


class CourseTaskModelTests(TestCase):
    def setUp(self):
        self.course = make_course(make_user('owner@example.com', 'mentor'))

    def test_hours_must_be_positive(self):
        for hours in (Decimal('0'), Decimal('-1.00')):
            with self.subTest(hours=hours), self.assertRaises(IntegrityError), transaction.atomic():
                CourseTask.objects.create(course=self.course, title='Zadanie', hours=hours)

    def test_hours_accepts_two_decimal_places(self):
        task = CourseTask.objects.create(course=self.course, title='Zadanie', hours=Decimal('2.50'))
        task.refresh_from_db()
        self.assertEqual(task.hours, Decimal('2.50'))

    def test_hours_rejects_more_than_two_decimal_places(self):
        task = CourseTask(course=self.course, title='Zadanie', hours=Decimal('2.555'))
        with self.assertRaises(ValidationError):
            task.full_clean()

    def test_title_is_limited_to_255_characters(self):
        task = CourseTask(course=self.course, title='x' * 256, hours=Decimal('1'))
        with self.assertRaises(ValidationError):
            task.full_clean()


class CourseModelTests(TestCase):
    def setUp(self):
        self.owner = make_user('owner@example.com', 'mentor')

    def test_private_course_gets_invite_token_on_save(self):
        course = make_course(self.owner, visibility=Course.Visibility.PRIVATE)
        course.refresh_from_db()
        self.assertTrue(course.invite_token)

    def test_public_course_has_no_invite_token(self):
        course = make_course(self.owner)
        course.refresh_from_db()
        self.assertIsNone(course.invite_token)

    def test_invite_token_is_unique(self):
        first = make_course(self.owner, visibility=Course.Visibility.PRIVATE)
        second = make_course(self.owner, visibility=Course.Visibility.PRIVATE)
        second.invite_token = first.invite_token
        with self.assertRaises(IntegrityError), transaction.atomic():
            second.save()

    def test_pending_can_be_approved(self):
        course = make_course(self.owner, status=Course.ApprovalStatus.PENDING)
        course.approval_status = Course.ApprovalStatus.APPROVED
        course.save()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.APPROVED)

    def test_pending_can_be_rejected(self):
        course = make_course(self.owner, status=Course.ApprovalStatus.PENDING)
        course.approval_status = Course.ApprovalStatus.REJECTED
        course.save()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.REJECTED)

    def test_rejected_can_be_resubmitted(self):
        course = make_course(self.owner, status=Course.ApprovalStatus.REJECTED)
        course.approval_status = Course.ApprovalStatus.PENDING
        course.save()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.PENDING)

    def test_approved_cannot_be_rejected(self):
        course = make_course(self.owner)
        course.approval_status = Course.ApprovalStatus.REJECTED
        with self.assertRaises(ValidationError):
            course.save()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.APPROVED)

    def test_rejected_cannot_be_approved_directly(self):
        course = make_course(self.owner, status=Course.ApprovalStatus.REJECTED)
        course.approval_status = Course.ApprovalStatus.APPROVED
        with self.assertRaises(ValidationError):
            course.save()

    def test_approved_cannot_go_back_to_pending_without_content_change(self):
        course = make_course(self.owner)
        course.approval_status = Course.ApprovalStatus.PENDING
        with self.assertRaises(ValidationError):
            course.save()

    def test_request_reverification_moves_approved_course_to_pending(self):
        course = make_course(self.owner)
        course.request_reverification()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.PENDING)

    def test_content_change_of_approved_public_course_returns_it_to_pending_on_plain_save(self):
        course = make_course(self.owner)
        course.title = 'Zmieniony tytul'
        course.save()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.PENDING)

    def test_deactivation_of_approved_course_keeps_approval(self):
        course = make_course(self.owner)
        course.is_active = False
        course.save()
        course.refresh_from_db()
        self.assertEqual(course.approval_status, Course.ApprovalStatus.APPROVED)

    def test_visibility_cannot_change_after_creation(self):
        course = make_course(self.owner)
        course.visibility = Course.Visibility.PRIVATE
        with self.assertRaises(ValidationError):
            course.save()


class InstanceModelTests(TestCase):
    def setUp(self):
        self.owner = make_user('owner@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.course_a = make_course(self.owner)
        self.course_b = make_course(self.owner, title='Drugi kurs')

    def test_student_can_have_only_one_active_instance(self):
        Instance.objects.create(course=self.course_a, student=self.student)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Instance.objects.create(course=self.course_b, student=self.student)

    def test_closed_instance_does_not_block_new_active_instance(self):
        Instance.objects.create(course=self.course_a, student=self.student, status=Instance.Status.CLOSED)
        Instance.objects.create(course=self.course_b, student=self.student)
        self.assertEqual(Instance.objects.filter(student=self.student, status=Instance.Status.ACTIVE).count(), 1)
