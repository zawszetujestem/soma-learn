from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import APIException

from learning import services
from learning.models import Course, CourseTask, Instance, InstancePeriod, InstanceTask
from learning.progress import calculate_progress
from learning.tests.helpers import make_course, make_user


def task(hours, status):
    return SimpleNamespace(hours=Decimal(hours), status=status)


class CalculateProgressTests(TestCase):
    def test_no_tasks_gives_zero(self):
        self.assertEqual(calculate_progress([]), Decimal('0.0'))

    def test_done_hours_share_of_total(self):
        tasks = [task('1', InstanceTask.Status.DONE), task('2', InstanceTask.Status.TODO)]
        self.assertEqual(calculate_progress(tasks), Decimal('33.3'))

    def test_full_completion_is_hundred(self):
        tasks = [task('1.5', InstanceTask.Status.DONE), task('2.5', InstanceTask.Status.DONE)]
        self.assertEqual(calculate_progress(tasks), Decimal('100.0'))

    def test_in_progress_does_not_count(self):
        tasks = [task('2', InstanceTask.Status.IN_PROGRESS), task('2', InstanceTask.Status.TODO)]
        self.assertEqual(calculate_progress(tasks), Decimal('0.0'))

    def test_half_up_rounding(self):
        tasks = [task('1', InstanceTask.Status.DONE), task('7', InstanceTask.Status.TODO)]
        self.assertEqual(calculate_progress(tasks), Decimal('12.5'))


class JoinCourseServiceTests(TestCase):
    def setUp(self):
        self.owner = make_user('mentor@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.course = make_course(self.owner)
        CourseTask.objects.create(course=self.course, title='Lekcja 1', hours=Decimal('2.00'), position=1)
        CourseTask.objects.create(course=self.course, title='Lekcja 2', hours=Decimal('3.00'), position=2)

    def test_join_creates_instance_with_mentor_period_and_copied_tasks(self):
        instance, created = services.join_course(self.student, course_id=self.course.pk)
        self.assertTrue(created)
        self.assertEqual(instance.mentor, self.owner)
        self.assertEqual(instance.status, Instance.Status.ACTIVE)
        self.assertEqual(instance.periods.count(), 1)
        self.assertIsNone(instance.periods.get().ended_at)
        copied = list(instance.tasks.values_list('title', 'hours', 'status'))
        self.assertEqual(copied, [
            ('Lekcja 1', Decimal('2.00'), InstanceTask.Status.TODO),
            ('Lekcja 2', Decimal('3.00'), InstanceTask.Status.TODO),
        ])

    def test_copied_tasks_are_independent_from_course_tasks(self):
        instance, _ = services.join_course(self.student, course_id=self.course.pk)
        CourseTask.objects.filter(course=self.course).update(title='Zmieniony', hours=Decimal('9.00'))
        self.assertEqual(set(instance.tasks.values_list('title', flat=True)), {'Lekcja 1', 'Lekcja 2'})

    def test_existing_active_instance_in_same_course_is_returned(self):
        first, _ = services.join_course(self.student, course_id=self.course.pk)
        second, created = services.join_course(self.student, course_id=self.course.pk)
        self.assertFalse(created)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Instance.objects.count(), 1)

    def test_student_with_other_active_instance_gets_slot_taken(self):
        other = make_course(self.owner, title='Inny kurs')
        services.join_course(self.student, course_id=other.pk)
        with self.assertRaises(APIException) as ctx:
            services.join_course(self.student, course_id=self.course.pk)
        self.assertEqual(ctx.exception.detail['code'], 'slot_taken')
        self.assertEqual(ctx.exception.status_code, 409)

    def test_inactive_course_gives_course_inactive(self):
        self.course.is_active = False
        self.course.save()
        with self.assertRaises(APIException) as ctx:
            services.join_course(self.student, course_id=self.course.pk)
        self.assertEqual(ctx.exception.detail['code'], 'course_inactive')

    def test_inactive_course_blocks_join_even_with_existing_instance(self):
        services.join_course(self.student, course_id=self.course.pk)
        self.course.is_active = False
        self.course.save()
        with self.assertRaises(APIException) as ctx:
            services.join_course(self.student, course_id=self.course.pk)
        self.assertEqual(ctx.exception.detail['code'], 'course_inactive')
        self.assertEqual(Instance.objects.count(), 1)

    def test_user_without_student_role_gets_forbidden(self):
        mentor = make_user('other-mentor@example.com', 'mentor')
        with self.assertRaises(APIException) as ctx:
            services.join_course(mentor, course_id=self.course.pk)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(Instance.objects.count(), 0)

    def test_owner_preview_has_no_mentor(self):
        instance, _ = services.join_course(self.owner, course_id=self.course.pk)
        self.assertIsNone(instance.mentor)

    def test_owner_of_pending_course_gets_course_not_approved(self):
        pending = make_course(self.owner, title='Oczekujacy', status=Course.ApprovalStatus.PENDING)
        with self.assertRaises(APIException) as ctx:
            services.join_course(self.owner, course_id=pending.pk)
        self.assertEqual(ctx.exception.detail['code'], 'course_not_approved')

    def test_non_owner_cannot_see_unapproved_course(self):
        pending = make_course(self.owner, title='Oczekujacy', status=Course.ApprovalStatus.PENDING)
        with self.assertRaises(APIException) as ctx:
            services.join_course(self.student, course_id=pending.pk)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_private_course_needs_valid_token(self):
        private = make_course(self.owner, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        with self.assertRaises(APIException) as ctx:
            services.join_course(self.student, course_id=private.pk)
        self.assertEqual(ctx.exception.status_code, 404)

        instance, created = services.join_by_token(self.student, private.invite_token)
        self.assertTrue(created)
        self.assertEqual(instance.course, private)

    def test_invalid_token_gives_not_found(self):
        with self.assertRaises(APIException) as ctx:
            services.join_by_token(self.student, 'nieistniejacy-token')
        self.assertEqual(ctx.exception.status_code, 404)


class InstanceLifecycleServiceTests(TestCase):
    def setUp(self):
        self.owner = make_user('mentor@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.course = make_course(self.owner)
        CourseTask.objects.create(course=self.course, title='Lekcja', hours=Decimal('4.00'))
        self.instance, _ = services.join_course(self.student, course_id=self.course.pk)

    def test_close_sets_status_closed_at_and_ends_period(self):
        services.close_instance(self.owner, self.instance)
        self.instance.refresh_from_db()
        self.assertEqual(self.instance.status, Instance.Status.CLOSED)
        self.assertIsNotNone(self.instance.closed_at)
        self.assertIsNotNone(self.instance.periods.get().ended_at)

    def test_closing_twice_gives_already_closed_and_keeps_closed_at(self):
        services.close_instance(self.owner, self.instance)
        self.instance.refresh_from_db()
        closed_at = self.instance.closed_at
        with self.assertRaises(APIException) as ctx:
            services.close_instance(self.owner, self.instance)
        self.assertEqual(ctx.exception.detail['code'], 'already_closed')
        self.instance.refresh_from_db()
        self.assertEqual(self.instance.closed_at, closed_at)

    def test_failed_close_is_rolled_back(self):
        with mock.patch.object(InstancePeriod, 'save', side_effect=RuntimeError('boom')):
            with self.assertRaises(RuntimeError):
                services.close_instance(self.owner, self.instance)
        self.instance.refresh_from_db()
        self.assertEqual(self.instance.status, Instance.Status.ACTIVE)
        self.assertIsNone(self.instance.closed_at)

    def test_resume_keeps_id_tasks_and_starts_new_period(self):
        services.close_instance(self.owner, self.instance)
        task_ids = list(self.instance.tasks.values_list('id', flat=True))
        services.resume_instance(self.owner, self.instance)
        self.instance.refresh_from_db()
        self.assertEqual(self.instance.status, Instance.Status.ACTIVE)
        self.assertIsNone(self.instance.closed_at)
        self.assertEqual(list(self.instance.tasks.values_list('id', flat=True)), task_ids)
        periods = list(self.instance.periods.order_by('id'))
        self.assertEqual(len(periods), 2)
        self.assertIsNotNone(periods[0].ended_at)
        self.assertIsNone(periods[1].ended_at)
        self.assertGreaterEqual(periods[1].started_at, periods[0].ended_at)

    def test_resume_of_active_instance_gives_already_active(self):
        with self.assertRaises(APIException) as ctx:
            services.resume_instance(self.owner, self.instance)
        self.assertEqual(ctx.exception.detail['code'], 'already_active')

    def test_resume_blocked_when_student_has_other_active_instance(self):
        services.close_instance(self.owner, self.instance)
        other = make_course(self.owner, title='Inny')
        services.join_course(self.student, course_id=other.pk)
        with self.assertRaises(APIException) as ctx:
            services.resume_instance(self.owner, self.instance)
        self.assertEqual(ctx.exception.detail['code'], 'slot_taken')

    def test_resume_blocked_when_course_inactive(self):
        services.close_instance(self.owner, self.instance)
        Course.objects.filter(pk=self.course.pk).update(is_active=False)
        self.instance.course.refresh_from_db()
        with self.assertRaises(APIException) as ctx:
            services.resume_instance(self.owner, self.instance)
        self.assertEqual(ctx.exception.detail['code'], 'course_inactive')

    def test_task_status_change_in_closed_instance_is_rejected(self):
        services.close_instance(self.owner, self.instance)
        task = self.instance.tasks.get()
        with self.assertRaises(APIException) as ctx:
            services.change_instance_task_status(self.owner, self.instance, task, InstanceTask.Status.DONE)
        self.assertEqual(ctx.exception.detail['code'], 'instance_closed')
        task.refresh_from_db()
        self.assertEqual(task.status, InstanceTask.Status.TODO)

    def test_task_status_change_updates_progress_source(self):
        task = self.instance.tasks.get()
        services.change_instance_task_status(self.owner, self.instance, task, InstanceTask.Status.DONE)
        task.refresh_from_db()
        self.assertEqual(task.status, InstanceTask.Status.DONE)

    def test_student_without_mentor_can_change_task_status(self):
        solo_course = make_course(self.owner, title='Solo')
        solo, _ = services.join_course(self.owner, course_id=solo_course.pk)
        task = solo.tasks.create(title='Zadanie', hours=Decimal('1.00'))
        services.change_instance_task_status(self.owner, solo, task, InstanceTask.Status.DONE)
        task.refresh_from_db()
        self.assertEqual(task.status, InstanceTask.Status.DONE)

    def test_student_with_mentor_cannot_change_task_status(self):
        task = self.instance.tasks.get()
        with self.assertRaises(APIException) as ctx:
            services.change_instance_task_status(self.student, self.instance, task, InstanceTask.Status.DONE)
        self.assertEqual(ctx.exception.status_code, 403)


class CourseManagementServiceTests(TestCase):
    def setUp(self):
        self.owner = make_user('mentor@example.com', 'mentor')
        self.course = make_course(self.owner)

    def test_editing_approved_public_course_returns_it_to_pending(self):
        services.update_course(self.course, {'title': 'Nowy tytul'})
        self.course.refresh_from_db()
        self.assertEqual(self.course.approval_status, Course.ApprovalStatus.PENDING)
        self.assertEqual(self.course.title, 'Nowy tytul')

    def test_unchanged_content_keeps_approval(self):
        services.update_course(self.course, {'title': self.course.title, 'is_active': False})
        self.course.refresh_from_db()
        self.assertEqual(self.course.approval_status, Course.ApprovalStatus.APPROVED)
        self.assertFalse(self.course.is_active)

    def test_editing_private_course_does_not_need_review(self):
        private = make_course(self.owner, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        services.update_course(private, {'title': 'Zmieniony'})
        private.refresh_from_db()
        self.assertEqual(private.approval_status, Course.ApprovalStatus.APPROVED)

    def test_resubmit_only_from_rejected(self):
        with self.assertRaises(APIException) as ctx:
            services.resubmit_course(self.course)
        self.assertEqual(ctx.exception.detail['code'], 'course_not_rejected')

        rejected = make_course(self.owner, title='Odrzucony', status=Course.ApprovalStatus.REJECTED)
        services.resubmit_course(rejected)
        rejected.refresh_from_db()
        self.assertEqual(rejected.approval_status, Course.ApprovalStatus.PENDING)

    def test_regenerate_token_only_for_private(self):
        with self.assertRaises(APIException) as ctx:
            services.regenerate_invite_token(self.course)
        self.assertEqual(ctx.exception.detail['code'], 'course_not_private')

    def test_regenerate_token_changes_token(self):
        private = make_course(self.owner, visibility=Course.Visibility.PRIVATE, title='Prywatny')
        old = private.invite_token
        services.regenerate_invite_token(private)
        private.refresh_from_db()
        self.assertNotEqual(private.invite_token, old)
        self.assertTrue(private.invite_token)
