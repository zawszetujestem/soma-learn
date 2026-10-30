from learning.models import NodeTest, NodePrerequisite
from learning.tests.content_helpers import ContentAPICase


class NodeTestsAPITests(ContentAPICase):
    def test_empty_draft_duplicate_replace_and_delete(self):
        for node in (self.section, self.topic, self.lesson):
            path = f'nodes/{node.pk}/test/'
            response = self.write('post', path, {})
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data['questions'], [])
            self.error(self.write('post', path, {}), 409, 'test_exists')
            response = self.write(
                'put',
                path,
                {
                    'questions': [
                        {
                            'type': 'single',
                            'text': 'Question',
                            'options': [
                                {'text': 'Yes', 'is_correct': True},
                                {'text': 'No'},
                            ],
                        }
                    ]
                },
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data['questions'][0]['options'][0]['is_correct'])
            self.assertEqual(self.write('delete', path).status_code, 204)

    def test_invalid_shape_and_atomic_replace(self):
        path = f'nodes/{self.lesson.pk}/test/'
        self.write('post', path, {})
        for data in (
            {},
            {'questions': None},
            {'questions': [{'type': 'essay'}]},
            {'questions': [{'options': 'bad'}]},
            {'questions': [{'options': [{'is_correct': 'yes'}]}]},
        ):
            self.error(self.write('put', path, data), 400, 'validation_error')
        self.assertEqual(NodeTest.objects.get(node=self.lesson).questions.count(), 0)

    def test_delete_source_test_blocked(self):
        NodeTest.objects.create(node=self.lesson)
        target = self.node('lesson', self.topic)
        NodePrerequisite.objects.create(source=self.lesson, target=target, threshold=70)
        self.error(
            self.write('delete', f'nodes/{self.lesson.pk}/test/'),
            409,
            'prerequisite_conflict',
        )

    def test_validation_reports_test_completeness(self):
        path = f'nodes/{self.lesson.pk}/test/'
        self.write(
            'post',
            path,
            {
                'questions': [
                    {
                        'type': 'single',
                        'text': 'Q',
                        'options': [
                            {'text': 'A', 'is_correct': True},
                            {'text': 'B', 'is_correct': True},
                        ],
                    }
                ]
            },
        )
        response = self.client.get(self.url + 'validation/')
        self.assertTrue(
            any(
                'test.questions.0' in issue['path'] for issue in response.data['issues']
            )
        )
        self.write(
            'put',
            path,
            {
                'questions': [
                    {
                        'type': 'multiple',
                        'text': 'Q',
                        'options': [
                            {'text': 'A', 'is_correct': True},
                            {'text': 'B', 'is_correct': True},
                        ],
                    }
                ]
            },
        )
        response = self.client.get(self.url + 'validation/')
        self.assertFalse(
            any('test' in issue['path'] for issue in response.data['issues'])
        )
