from learning.models import NodeTest, NodePrerequisite, CourseNode
from learning.tests.content_helpers import ContentAPICase


class PrerequisiteTests(ContentAPICase):
    def setUp(self):
        super().setUp()
        self.source = self.lesson
        NodeTest.objects.create(node=self.source)
        self.target = self.node('lesson', self.topic)
        self.path = f'nodes/{self.target.pk}/prerequisite/'

    def test_valid_dependency_and_idempotent_delete(self):
        response = self.write(
            'put', self.path, {'source_id': self.source.pk, 'threshold': 70}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['message'])
        self.assertEqual(response.data['source_id'], self.source.pk)
        for _ in range(2):
            self.assertEqual(self.write('delete', self.path).status_code, 204)

    def test_invalid_pairs_ancestors_self_later_and_missing_test(self):
        NodeTest.objects.create(node=self.section)
        later = self.node('lesson', self.topic)
        NodeTest.objects.create(node=later)
        for data in (
            {'source_id': self.source.pk},
            {'threshold': 70},
            {'source_id': self.source.pk, 'threshold': 0},
            {'source_id': self.source.pk, 'threshold': 101},
            {'source_id': self.source.pk, 'threshold': True},
            {'source_id': self.source.pk, 'threshold': 1.5},
            {'source_id': self.target.pk, 'threshold': 70},
            {'source_id': self.section.pk, 'threshold': 70},
            {'source_id': later.pk, 'threshold': 70},
            {'source_id': self.topic.pk, 'threshold': 70},
        ):
            self.error(self.write('put', self.path, data), 400, 'invalid_prerequisite')

    def test_move_and_delete_conflict_are_atomic(self):
        self.assertEqual(
            self.write(
                'put', self.path, {'source_id': self.source.pk, 'threshold': 70}
            ).status_code,
            200,
        )
        response = self.write(
            'post', f'nodes/{self.source.pk}/move/', {'direction': 'down'}
        )
        data = self.error(response, 409, 'prerequisite_conflict')
        self.assertEqual(data['dependencies'][0]['target_id'], self.target.pk)
        self.error(
            self.write('delete', f'nodes/{self.source.pk}/'),
            409,
            'prerequisite_conflict',
        )
        self.source.refresh_from_db()
        self.assertEqual(self.source.position, 1)
        self.version.refresh_from_db()
        self.assertEqual(self.version.revision, 2)
        self.assertEqual(
            self.write('delete', f'nodes/{self.section.pk}/').status_code, 204
        )
        self.assertFalse(CourseNode.objects.filter(version=self.version).exists())
        self.assertFalse(NodePrerequisite.objects.exists())

    def test_whole_section_move_validates_descendants(self):
        second = self.node('section')
        topic = self.node('topic', second)
        target = self.node('lesson', topic)
        self.assertEqual(
            self.write(
                'put',
                f'nodes/{target.pk}/prerequisite/',
                {'source_id': self.source.pk, 'threshold': 1},
            ).status_code,
            200,
        )
        self.error(
            self.write('post', f'nodes/{second.pk}/move/', {'direction': 'up'}),
            409,
            'prerequisite_conflict',
        )
        self.error(
            self.write('delete', f'nodes/{self.section.pk}/'),
            409,
            'prerequisite_conflict',
        )
