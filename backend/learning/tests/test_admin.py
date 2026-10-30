from django.contrib import admin
from django.test import RequestFactory
from learning.tests.content_helpers import ContentAPICase
from learning.tests import test_version_lifecycle as lifecycle
from learning.models import Course, CourseVersion, CourseScope, CourseSubject


class CourseAdminTests(ContentAPICase):
    complete = lifecycle.VersionLifecycleTests.complete

    def test_content_is_readonly_and_cannot_be_added_or_deleted(self):
        request=RequestFactory().get('/admin/')
        request.user=self.admin
        for model,obj in [(Course,self.course),(CourseVersion,self.version)]:
            model_admin=admin.site._registry[model]
            self.assertFalse(model_admin.has_add_permission(request))
            self.assertFalse(model_admin.has_delete_permission(request,obj))
            self.assertTrue(set(f.name for f in model._meta.fields) <= set(model_admin.get_readonly_fields(request,obj)))
        for model in [CourseScope,CourseSubject]:
            self.assertIn('is_active',admin.site._registry[model].list_editable)

    def test_admin_actions_use_same_lifecycle_and_preview_link(self):
        self.complete()
        self.write('post','submit/')
        request=RequestFactory().post('/admin/')
        request.user=self.admin
        model_admin=admin.site._registry[CourseVersion]
        from unittest import mock
        with mock.patch.object(model_admin,'message_user'):
            model_admin.accept_versions(request,CourseVersion.objects.filter(pk=self.version.pk))
        self.version.refresh_from_db();self.course.refresh_from_db()
        self.assertEqual(self.version.state,'published')
        self.assertEqual(self.course.current_published_version_id,self.version.pk)
        self.assertIn(f'/kursy/podglad/{self.course.pk}/wersje/{self.version.pk}',str(model_admin.preview_link(self.version)))

    def test_reject_action_and_validation_failure_do_not_publish(self):
        self.version.state='submitted';self.version.save()
        request=RequestFactory().post('/admin/');request.user=self.admin
        model_admin=admin.site._registry[CourseVersion]
        from unittest import mock
        with mock.patch.object(model_admin,'message_user'):
            model_admin.accept_versions(request,CourseVersion.objects.filter(pk=self.version.pk))
        self.version.refresh_from_db();self.assertEqual(self.version.state,'submitted')
        with mock.patch.object(model_admin,'message_user'):
            model_admin.reject_versions(request,CourseVersion.objects.filter(pk=self.version.pk))
        self.version.refresh_from_db();self.assertEqual(self.version.state,'rejected')
