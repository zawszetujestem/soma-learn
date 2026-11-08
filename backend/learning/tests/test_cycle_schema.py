from django.test import TestCase
from drf_spectacular.generators import SchemaGenerator


class CycleSchemaTests(TestCase):
    def test_new_fields_match_api_types(self):
        schemas = SchemaGenerator().get_schema(request=None, public=True)['components']['schemas']
        task = schemas['InstanceTask']['properties']
        self.assertEqual(task['prerequisite_ids']['type'], 'array')
        self.assertEqual(task['blocked']['type'], 'boolean')
        self.assertEqual(task['selected']['type'], 'boolean')
        instance = schemas['Instance']['properties']
        self.assertIn('Cycle', str(instance['active_cycle']))
        self.assertEqual(instance['cycle_history']['type'], 'array')
