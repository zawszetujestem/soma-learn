from decimal import Decimal

from django.db import connection, IntegrityError, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


class VersionMigrationTests(TransactionTestCase):
    def test_backfill_preserves_legacy_data_and_pins_all_instances(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        executor.migrate([('learning', '0001_initial')])
        try:
            apps = executor.loader.project_state([('learning', '0001_initial')]).apps
            User = apps.get_model('users', 'User')
            owner = User.objects.create(email='migration-owner@example.com', password='!')
            now = timezone.now()
            courses, instances = [], []
            for i, status in enumerate(('approved', 'pending', 'rejected')):
                course = apps.get_model('learning', 'Course').objects.create(owner=owner, title=f'Course {i}', description=f'Desc {i}', visibility='private' if i == 0 else 'public', invite_token='existing-token' if i == 0 else None, approval_status=status, is_active=i != 2)
                courses.append(course.pk)
                apps.get_model('learning', 'CourseTask').objects.create(course=course, title='Plan', hours=Decimal('2.50'), position=3)
                for state in ('active', 'closed'):
                    student = User.objects.create(email=f'{i}-{state}@example.com', password='!')
                    instance = apps.get_model('learning', 'Instance').objects.create(course=course, student=student, mentor=owner, status=state, closed_at=now if state == 'closed' else None)
                    instances.append(instance.pk)
                    apps.get_model('learning', 'InstanceTask').objects.create(instance=instance, title='Snapshot', hours=Decimal('2.50'), position=3, status='done')
                    apps.get_model('learning', 'InstancePeriod').objects.create(instance=instance, started_at=now, ended_at=now if state == 'closed' else None)
            snapshots = {}
            for name in ('Course', 'Instance', 'CourseTask', 'InstanceTask', 'InstancePeriod'):
                snapshots[name] = list(apps.get_model('learning', name).objects.order_by('pk').values())
            executor = MigrationExecutor(connection)
            executor.migrate([('learning', '0004_require_instance_version')])
            new = executor.loader.project_state([('learning', '0004_require_instance_version')]).apps
            for pk, expected in zip(courses, ('published', 'submitted', 'rejected')):
                course = new.get_model('learning', 'Course').objects.get(pk=pk)
                version = new.get_model('learning', 'CourseVersion').objects.get(course_id=pk)
                self.assertEqual((version.number, version.state, version.title, version.description, version.legacy_import), (1, expected, course.title, course.description, True))
                self.assertEqual(course.current_published_version_id, version.pk if expected == 'published' else None)
                self.assertIsNone(version.scope_id)
                self.assertIsNone(version.subject_id)
                self.assertEqual(set(new.get_model('learning', 'Instance').objects.filter(course_id=pk).values_list('course_version_id', flat=True)), {version.pk})
            for name, old in snapshots.items():
                fields = list(old[0])
                self.assertEqual(list(new.get_model('learning', name).objects.order_by('pk').values(*fields)), old)
            self.assertFalse(new.get_model('learning', 'Instance')._meta.get_field('course_version').null)
            with self.assertRaises(IntegrityError), transaction.atomic():
                new.get_model('learning', 'Instance').objects.filter(pk=instances[0]).update(course_version=None)
        finally:
            MigrationExecutor(connection).migrate(latest)
