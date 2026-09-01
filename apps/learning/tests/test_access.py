from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.learning.models import Course, Relationship
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

    def test_mentor_sees_only_active_students_in_course(self) -> None:
        Relationship.objects.create(mentor=self.mentor, student=self.student, course=self.course)
        Relationship.objects.create(
            mentor=self.other_mentor, student=self.other_student, course=self.course
        )
        Relationship.objects.create(
            mentor=self.mentor, student=self.student, course=self.other_course
        )

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertQuerySetEqual(students, [self.student])

    def test_ended_relationship_is_not_visible(self) -> None:
        Relationship.objects.create(
            mentor=self.mentor,
            student=self.student,
            course=self.course,
            status=Relationship.Status.ENDED,
        )

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_unrelated_mentor_sees_no_students(self) -> None:
        Relationship.objects.create(mentor=self.mentor, student=self.student, course=self.course)

        students = students_with_active_relationship(mentor=self.other_mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_course_isolation(self) -> None:
        Relationship.objects.create(
            mentor=self.mentor, student=self.student, course=self.other_course
        )

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_deleted_mentor_loses_access_to_students(self) -> None:
        Relationship.objects.create(mentor=self.mentor, student=self.student, course=self.course)
        self.mentor.soft_delete()
        end_relationships_for_user(user=self.mentor)

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())

    def test_deleted_student_is_not_visible_to_mentor(self) -> None:
        Relationship.objects.create(mentor=self.mentor, student=self.student, course=self.course)
        self.student.soft_delete()
        end_relationships_for_user(user=self.student)

        students = students_with_active_relationship(mentor=self.mentor, course=self.course)

        self.assertFalse(students.exists())
