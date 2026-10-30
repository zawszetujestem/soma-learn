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


@skipUnlessDBFeature('has_select_for_update')
class ConcurrentContentTests(TransactionTestCase):
    """Run on PostgreSQL: course locks serialize every version/content writer."""

    def setUp(self):
        import tempfile
        from django.test import override_settings
        from learning.models import CourseVersion, CourseNode
        if connection.vendor != 'postgresql':
            self.skipTest('Requires PostgreSQL.')
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        override=override_settings(MEDIA_ROOT=self.temp.name,PRIVATE_MEDIA_ROOT=self.temp.name)
        override.enable(); self.addCleanup(override.disable)
        self.owner=make_user('concurrent-content@example.com','mentor')
        self.course=make_course(self.owner,legacy=False)
        self.version=CourseVersion.objects.create(course=self.course,number=1)
        self.section=CourseNode.objects.create(version=self.version,kind='section',title='S',position=1)
        topic=CourseNode.objects.create(version=self.version,kind='topic',title='T',parent=self.section,position=1)
        self.lesson=CourseNode.objects.create(version=self.version,kind='lesson',title='L',parent=topic,position=1)
        self.url=f'/api/courses/{self.course.pk}/versions/{self.version.pk}/'

    def race(self, callback):
        from rest_framework.test import APIClient
        barrier=threading.Barrier(2)
        results=[None,None]
        def worker(i):
            try:
                client=APIClient(); client.force_authenticate(self.owner)
                barrier.wait(timeout=10)
                results[i]=callback(client)
            except Exception as exc:
                results[i]=exc
            finally:
                connections.close_all()
        threads=[threading.Thread(target=worker,args=(i,)) for i in range(2)]
        for thread in threads: thread.start()
        for thread in threads:
            thread.join(timeout=30)
            self.assertFalse(thread.is_alive())
        self.assertTrue(all(hasattr(result,'status_code') for result in results),results)
        self.assertEqual(sorted(result.status_code for result in results),[201,409])
        for result in results:
            if result.status_code==409:
                self.assertEqual(result.data['code'],'stale_revision')
                self.assertTrue(result.data['message'].strip())
        self.version.refresh_from_db(); self.assertEqual(self.version.revision,2)

    def test_parallel_test_creation(self):
        from learning.models import NodeTest
        self.race(lambda client: client.post(self.url+f'nodes/{self.section.pk}/test/',{},format='json',HTTP_IF_MATCH=f'"v{self.version.pk}-r1"'))
        self.assertEqual(NodeTest.objects.filter(node=self.section).count(),1)

    def test_parallel_attachments_cannot_exceed_20(self):
        from learning.models import CourseAsset, LessonItem
        asset=CourseAsset.objects.create(course=self.course,created_by=self.owner,file='not-real',original_name='a',media_type='image/png',size_bytes=10)
        for position in range(1,20):
            LessonItem.objects.create(lesson=self.lesson,category='theory',format='image',asset=asset,image_alt='Alt',position=position)
        self.race(lambda client: client.post(self.url+f'lessons/{self.lesson.pk}/items/',{'category':'practice','format':'image','image_alt':'Alt','asset_id':str(asset.pk)},format='json',HTTP_IF_MATCH=f'"v{self.version.pk}-r1"'))
        self.assertEqual(self.lesson.items.count(),20)

    def test_parallel_uploads_cannot_exceed_course_limit(self):
        from django.test import override_settings
        from django.core.files.uploadedfile import SimpleUploadedFile
        from learning.tests.content_helpers import image_bytes
        from learning.models import CourseAsset
        data=image_bytes()
        with override_settings(COURSE_STORAGE_MAX_BYTES=len(data)):
            self.race(lambda client: client.post(self.url+'assets/',{'file':SimpleUploadedFile('a.png',data,'image/png')},format='multipart',HTTP_IF_MATCH=f'"v{self.version.pk}-r1"'))
        self.assertEqual(CourseAsset.objects.filter(course=self.course).count(),1)


@skipUnlessDBFeature('has_select_for_update')
class ConcurrentVersionLifecycleTests(TransactionTestCase):
    def setUp(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Requires PostgreSQL.')
        from learning.tests.helpers import complete_version
        self.owner=make_user('race-owner@example.com','mentor')
        self.admin=make_user('race-admin@example.com','admin')
        self.student=make_user('race-student@example.com','student')
        self.course=make_course(self.owner)
        self.v1=self.course.current_published_version
        from learning.version_services import copy_publication
        self.draft=complete_version(copy_publication(self.owner,self.course.pk))

    def race(self, *callbacks):
        barrier=threading.Barrier(len(callbacks))
        results=[None]*len(callbacks)
        def worker(index,callback):
            try:
                barrier.wait(timeout=10)
                results[index]=callback()
            except Exception as exc:
                results[index]=exc
            finally:
                connections.close_all()
        threads=[threading.Thread(target=worker,args=(i,cb)) for i,cb in enumerate(callbacks)]
        for thread in threads: thread.start()
        for thread in threads:
            thread.join(timeout=30)
            self.assertFalse(thread.is_alive(), 'Possible deadlock')
        return results

    def test_publish_vs_join_pins_one_whole_version_and_task_snapshot(self):
        from learning import version_services
        from learning.content_services import etag
        from learning.models import Course, CourseTask
        CourseTask.objects.create(course=self.course,title='Hours',hours=2)
        Course.objects.filter(pk=self.course.pk).update(owner=self.admin)
        results=self.race(
            lambda: version_services.transition(self.admin,self.course.pk,self.draft.pk,etag(self.draft),'publish'),
            lambda: services.join_course(self.student,course_id=self.course.pk))
        self.assertFalse(any(isinstance(r,Exception) for r in results),results)
        instance=Instance.objects.get(student=self.student)
        self.assertIn(instance.course_version_id,[self.v1.pk,self.draft.pk])
        self.assertEqual(list(instance.tasks.values_list('title',flat=True)),['Hours'])
        self.course.refresh_from_db()
        self.assertEqual(self.course.current_published_version_id,self.draft.pk)

    def test_accept_vs_withdraw_only_one_decision_succeeds(self):
        from learning import version_services
        from learning.content_services import etag
        submitted=version_services.transition(self.owner,self.course.pk,self.draft.pk,etag(self.draft),'submit')
        results=self.race(
            lambda: version_services.transition(self.admin,self.course.pk,self.draft.pk,etag(submitted),'accept'),
            lambda: version_services.transition(self.owner,self.course.pk,self.draft.pk,etag(submitted),'withdraw'))
        failures=[r for r in results if isinstance(r,Exception)]
        self.assertEqual(len(failures),1,results)
        self.assertIsInstance(failures[0],services.DomainError)
        self.assertEqual(failures[0].detail['code'],'invalid_version_state')
        self.draft.refresh_from_db();self.course.refresh_from_db()
        self.assertIn(self.draft.state,['published','draft'])
        self.assertEqual(self.course.current_published_version_id,self.draft.pk if self.draft.state=='published' else self.v1.pk)

    def test_parallel_draft_creation(self):
        from learning import version_services
        from learning.content_services import etag
        from learning.models import Course
        Course.objects.filter(pk=self.course.pk).update(owner=self.admin)
        version_services.transition(self.admin,self.course.pk,self.draft.pk,etag(self.draft),'publish')
        results=self.race(*[lambda:version_services.copy_publication(self.admin,self.course.pk)]*2)
        failures=[r for r in results if isinstance(r,Exception)]
        self.assertEqual(len(failures),1,results)
        self.assertIsInstance(failures[0],services.DomainError)
        self.assertEqual(failures[0].detail['code'],'working_version_exists')
        self.assertEqual(self.course.versions.filter(state='draft').count(),1)

    def test_save_vs_submit_never_overwrites_submitted_content(self):
        from learning import content_services as content, version_services
        def edit():
            with content.edit_version(self.owner,self.course.pk,self.draft.pk,content.etag(self.draft)) as v:
                content.update_metadata(v,{'title':'Concurrent edit'})
                content.bump_revision(v)
            return v
        results=self.race(edit,lambda:version_services.transition(self.owner,self.course.pk,self.draft.pk,content.etag(self.draft),'submit'))
        failures=[r for r in results if isinstance(r,Exception)]
        self.assertEqual(len(failures),1,results)
        self.assertIsInstance(failures[0],services.DomainError)
        self.assertIn(failures[0].detail['code'],['stale_revision','invalid_version_state'])
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.revision,2)
