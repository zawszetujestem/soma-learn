from django.test import TestCase

from learning.models import CourseScope, CourseSubject

EXPECTED_SCOPES = {'Szkoła podstawowa', 'Szkoła średnia'}
EXPECTED_SUBJECTS = {
    'Język polski', 'Matematyka', 'Język angielski', 'Język niemiecki', 'Język francuski',
    'Język hiszpański', 'Język rosyjski', 'Język włoski', 'Historia', 'Wiedza o społeczeństwie',
    'Geografia', 'Biologia', 'Chemia', 'Fizyka', 'Informatyka', 'Filozofia',
    'Język łaciński i kultura antyczna',
}
EXCLUDED_SUBJECTS = {'Wychowanie fizyczne', 'Muzyka', 'Plastyka', 'Technika'}


class SeedClassificationsTests(TestCase):
    def test_scopes_are_seeded_active_without_duplicates(self):
        names = list(CourseScope.objects.values_list('name', flat=True))
        self.assertEqual(sorted(names), sorted(EXPECTED_SCOPES))
        self.assertFalse(CourseScope.objects.filter(is_active=False).exists())

    def test_exam_subjects_are_seeded_active_without_duplicates(self):
        names = list(CourseSubject.objects.values_list('name', flat=True))
        self.assertEqual(sorted(names), sorted(EXPECTED_SUBJECTS))
        self.assertFalse(CourseSubject.objects.filter(is_active=False).exists())
        self.assertFalse(EXCLUDED_SUBJECTS & set(names))

    def test_seed_is_idempotent_and_keeps_admin_changes(self):
        from importlib import import_module
        from django.apps import apps as global_apps

        seed = import_module('learning.migrations.0005_seed_classifications').seed_classifications
        CourseSubject.objects.filter(name='Filozofia').update(is_active=False)

        seed(global_apps, None)

        self.assertEqual(CourseScope.objects.count(), len(EXPECTED_SCOPES))
        self.assertEqual(CourseSubject.objects.count(), len(EXPECTED_SUBJECTS))
        self.assertFalse(CourseSubject.objects.get(name='Filozofia').is_active)
