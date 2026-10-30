import threading

from django.db import connection, connections
from django.test import TransactionTestCase, skipUnlessDBFeature

from learning import services
from learning.models import Instance
from learning.tests.helpers import make_course, make_user


@skipUnlessDBFeature('has_select_for_update')
class ConcurrentJoinTests(TransactionTestCase):
    """AC-26: równoległe dołączenia jednego ucznia do dwóch kursów -> jedna aktywna instancja."""

    def setUp(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Wymaga PostgreSQL.')
        self.mentor = make_user('mentor@example.com', 'mentor')
        self.student = make_user('student@example.com', 'student')
        self.course_a = make_course(self.mentor, title='A')
        self.course_b = make_course(self.mentor, title='B')

    def test_parallel_joins_to_two_courses_leave_one_active_instance(self):
        barrier = threading.Barrier(2)
        results = [None, None]

        def worker(index, course):
            try:
                barrier.wait(timeout=10)
                results[index] = services.join_course(self.student, course_id=course.pk)
            except Exception as exc:  # noqa: BLE001 - zbieramy wyjątek do asercji
                results[index] = exc
            finally:
                connections.close_all()

        threads = [
            threading.Thread(target=worker, args=(0, self.course_a)),
            threading.Thread(target=worker, args=(1, self.course_b)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        successes = [r for r in results if isinstance(r, tuple)]
        failures = [r for r in results if isinstance(r, Exception)]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0].detail['code'], 'slot_taken')
        self.assertEqual(
            Instance.objects.filter(student=self.student, status=Instance.Status.ACTIVE).count(),
            1,
        )
