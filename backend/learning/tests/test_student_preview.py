from learning.models import (
    LessonItem,
    NodeTest,
    TestQuestion,
    TestOption,
    Instance,
    InstancePeriod,
    InstanceTask,
)
from learning.tests.content_helpers import ContentAPICase


class StudentPreviewTests(ContentAPICase):
    def test_keys_absent_recursively_and_no_side_effects(self):
        LessonItem.objects.create(
            lesson=self.lesson,
            category='practice',
            format='text',
            text='Task',
            answer_mode='keyed',
            answer_text='secret',
            position=1,
        )
        test = NodeTest.objects.create(node=self.lesson)
        question = TestQuestion.objects.create(test=test, text='Question', position=1)
        TestOption.objects.create(
            question=question, text='Yes', is_correct=True, position=1
        )
        self.assertIn(
            'answer_text',
            self.client.get(self.url).data['nodes'][0]['children'][0]['children'][0][
                'practice'
            ][0],
        )
        before = [m.objects.count() for m in (Instance, InstancePeriod, InstanceTask)]
        for user in (self.owner, self.admin):
            self.client.force_authenticate(user)
            response = self.client.get(self.url + 'student-preview/')
            self.assertEqual(response.status_code, 200)

            def check(value):
                if isinstance(value, dict):
                    self.assertNotIn('answer_text', value)
                    self.assertNotIn('is_correct', value)
                    for v in value.values():
                        check(v)
                elif isinstance(value, list):
                    for v in value:
                        check(v)

            check(response.json())
        self.assertEqual(
            before,
            [m.objects.count() for m in (Instance, InstancePeriod, InstanceTask)],
        )
        self.version.refresh_from_db()
        self.assertEqual(self.version.revision, 1)
