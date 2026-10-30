from unittest import mock
from learning.tests.content_helpers import ContentAPICase
from learning.models import Course, CourseScope, CourseSubject, LessonItem


class VersionLifecycleTests(ContentAPICase):
    def complete(self):
        self.version.scope = CourseScope.objects.create(name='Scope')
        self.version.subject = CourseSubject.objects.create(name='Subject')
        self.version.save()
        LessonItem.objects.create(lesson=self.lesson, category='theory', format='markdown', text='Content', position=1)

    def test_submit_withdraw_reject_resubmit_accept(self):
        self.complete()
        self.assertEqual(self.write('post', 'submit/').status_code, 200)
        self.error(self.write('patch', '', {'title':'No'}), 409, 'invalid_version_state')
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/course-moderation/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([v['id'] for v in response.data], [self.version.pk])
        self.assertEqual(self.write('post', 'reject/', {'reason':'Fix'}).data['state'], 'rejected')
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.write('post', 'submit/').data['state'], 'submitted')
        self.assertEqual(self.write('post', 'withdraw/').data['state'], 'draft')
        self.assertEqual(self.write('post', 'submit/').status_code, 200)
        self.client.force_authenticate(self.admin)
        response = self.write('post', 'accept/')
        self.assertEqual(response.status_code, 200, response.content)
        self.course.refresh_from_db()
        self.assertEqual(self.course.current_published_version_id, self.version.pk)
        self.error(self.write('post', 'accept/'), 409, 'invalid_version_state')

    def test_validation_and_legacy_import_never_bypass_new_publication(self):
        self.version.legacy_import = True
        self.version.save()
        data = self.error(self.write('post', 'submit/'), 400, 'version_incomplete')
        self.assertTrue(data['issues'])
        self.version.refresh_from_db()
        self.assertEqual(self.version.state, 'draft')

    def test_accept_revalidates_inactive_dictionary(self):
        self.complete()
        self.assertEqual(self.write('post', 'submit/').status_code, 200)
        CourseScope.objects.filter(pk=self.version.scope_id).update(is_active=False)
        self.client.force_authenticate(self.admin)
        self.error(self.write('post', 'accept/'), 400, 'version_incomplete')
        self.course.refresh_from_db()
        self.assertIsNone(self.course.current_published_version_id)

    def test_role_matrix(self):
        self.complete()
        for user, expected in [(self.student,404),(self.other,404),(self.admin,403),(None,401)]:
            with self.subTest(user=user):
                self.client.force_authenticate(user)
                self.error(self.write('post','submit/'), expected, 'not_authenticated' if expected==401 else 'not_found' if expected==404 else 'forbidden')
        self.client.force_authenticate(self.owner)
        for operation in ['publish/', 'accept/', 'reject/']:
            self.error(self.write('post',operation),403,'forbidden')

    def test_private_and_admin_owner_publish(self):
        self.complete()
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        self.assertEqual(self.write('post','publish/').data['state'], 'published')

    def test_admin_owner_must_publish_not_submit(self):
        self.complete()
        Course.objects.filter(pk=self.course.pk).update(owner=self.admin)
        self.client.force_authenticate(self.admin)
        self.error(self.write('post','submit/'),403,'forbidden')
        self.assertEqual(self.write('post','publish/').data['state'],'published')

    def test_revision_required_stale_and_new_etag(self):
        self.complete()
        self.error(self.client.post(self.url+'submit/',{},format='json'),400,'revision_required')
        old = f'"v{self.version.pk}-r1"'
        response=self.write('post','submit/')
        self.assertEqual(response['ETag'], f'"v{self.version.pk}-r2"')
        self.error(self.write('post','withdraw/',HTTP_IF_MATCH=old),409,'stale_revision')

    def test_publish_rollback_after_pointer_save(self):
        self.complete()
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        from learning import version_services
        from learning.content_services import etag
        original = Course.save
        def fail_after_save(obj, *args, **kwargs):
            original(obj,*args,**kwargs)
            if obj.current_published_version_id:
                raise RuntimeError('simulated')
        with mock.patch.object(Course,'save',fail_after_save), self.assertRaises(RuntimeError):
            version_services.transition(self.owner,self.course.pk,self.version.pk,etag(self.version),'publish')
        self.version.refresh_from_db(); self.course.refresh_from_db()
        self.assertEqual(self.version.state,'draft')
        self.assertEqual(self.version.revision,1)
        self.assertIsNone(self.course.current_published_version_id)

    def test_state_matrix_for_every_operation(self):
        self.complete()
        for operation,states in [('submit',['draft','rejected']),('withdraw',['submitted']),('accept',['submitted']),('reject',['submitted']),('publish',['draft','rejected'])]:
            for state in ['draft','rejected','submitted','published']:
                with self.subTest(operation=operation,state=state):
                    # Fixtures deliberately reset state without making product transitions.
                    from learning.models import CourseVersion
                    CourseVersion.objects.filter(pk=self.version.pk).update(state=state)
                    Course.objects.filter(pk=self.course.pk).update(visibility='private' if operation=='publish' else 'public',current_published_version=None)
                    self.client.force_authenticate(self.admin if operation in ['accept','reject'] else self.owner)
                    response=self.write('post',operation+'/')
                    if state in states:
                        self.assertEqual(response.status_code,200,response.content)
                    else:
                        self.error(response,409,'invalid_version_state')

    def test_resubmit_adapter_requires_revision_and_preserves_legacy_status(self):
        self.complete()
        self.version.state='rejected';self.version.save()
        url=f'/api/courses/{self.course.pk}/resubmit/'
        self.error(self.client.post(url,{},format='json'),400,'revision_required')
        self.error(self.client.post(url,{},format='json',HTTP_IF_MATCH='"v0-r0"'),409,'stale_revision')
        self.version.refresh_from_db()
        response=self.client.post(url,{},format='json',HTTP_IF_MATCH=f'"v{self.version.pk}-r{self.version.revision}"')
        self.assertEqual(response.status_code,200,response.content)
        self.assertEqual(response.data['working_version']['state'],'submitted')
        self.assertEqual(response['ETag'], f'"v{self.version.pk}-r{self.version.revision + 1}"')
