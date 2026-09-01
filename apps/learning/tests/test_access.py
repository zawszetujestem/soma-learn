from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.models import User as UserModel
from apps.learning.models import Course, CourseInstance, Relationship
from apps.learning.services import end_relationships_for_user, students_with_active_relationship

User = get_user_model()


class StudentAccessSelectorTests(TestCase):
    def setUp(self) -> None:
        self.mentor = User.objects.create_user(email="mentor@example.com", password="pass1234")
        self.other_mentor = User.objects.create_user(
            email="other-mentor@example.com", password="pass1234"
        )
        self.student = User.objects.create_user(email="student@example.com", password="pass1234")
        self.other_student = User.objects.create_user(
            email="other-student@example.com", password="pass1234"
        )
        self.course = Course.objects.create(title="Matematyka - klasa 8")
        self.other_course = Course.objects.create(title="Fizyka - klasa 8")

    def _instance(self, mentor: UserModel, course: Course, student: UserModel) -> CourseInstance:
        return CourseInstance.objects.create(
            mentor=mentor, course=course, student_email=student.email, student=student
        )

    def test_mentor_sees_only_active_students_in_course(self) -> None:
        my_instance = self._instance(self.mentor, self.course, self.student)
        other_instance = self._instance(self.other_mentor, self.course, self.other_student)
        Relationship.objects.create(mentor=self.mentor, student=self.student, instance=my_instance)
        Relationship.objects.create(
            mentor=self.other_mentor, student=self.other_student, instance=other_instance
        )

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertQuerySetEqual(students, [self.student])

    def test_ended_relationship_is_not_visible(self) -> None:
        instance = self._instance(self.mentor, self.course, self.student)
        Relationship.objects.create(
            mentor=self.mentor,
            student=self.student,
            instance=instance,
            status=Relationship.Status.ENDED,
        )

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_unrelated_mentor_sees_no_students(self) -> None:
        instance = self._instance(self.mentor, self.course, self.student)
        Relationship.objects.create(mentor=self.mentor, student=self.student, instance=instance)

        students = students_with_active_relationship(mentor=self.other_mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_cross_course_isolation_for_same_pair(self) -> None:
        active_instance = self._instance(self.mentor, self.other_course, self.student)
        Relationship.objects.create(
            mentor=self.mentor, student=self.student, instance=active_instance
        )
        ended_instance = self._instance(self.mentor, self.course, self.student)
        Relationship.objects.create(
            mentor=self.mentor,
            student=self.student,
            instance=ended_instance,
            status=Relationship.Status.ENDED,
        )

        in_other_course = students_with_active_relationship(
            mentor=self.mentor, course=self.other_course
        )
        in_this_course = students_with_active_relationship(
            mentor=self.mentor, course=self.course
        )

        self.assertQuerySetEqual(in_other_course, [self.student])
        self.assertFalse(in_this_course.exists())

    def test_deleted_mentor_loses_access_to_students(self) -> None:
        instance = self._instance(self.mentor, self.course, self.student)
        Relationship.objects.create(mentor=self.mentor, student=self.student, instance=instance)
        self.mentor.soft_delete()
        end_relationships_for_user(user=self.mentor)

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_deleted_student_is_not_visible_to_mentor(self) -> None:
        instance = self._instance(self.mentor, self.course, self.student)
        Relationship.objects.create(mentor=self.mentor, student=self.student, instance=instance)
        self.student.soft_delete()
        end_relationships_for_user(user=self.student)

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())