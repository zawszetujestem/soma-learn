from learning.tests.content_helpers import ContentAPICase
from learning.tests import test_version_lifecycle as lifecycle
from learning.models import Course, CourseTask, NodeTest, TestQuestion, TestOption, NodePrerequisite, LessonItem


class VersionCopyTests(ContentAPICase):
    complete = lifecycle.VersionLifecycleTests.complete
    def test_copy_remaps_every_content_id_but_shares_assets_and_not_tasks(self):
        self.complete()
        test=NodeTest.objects.create(node=self.lesson)
        question=TestQuestion.objects.create(test=test,position=1,type='single',text='Q')
        TestOption.objects.create(question=question,position=1,text='A',is_correct=True)
        TestOption.objects.create(question=question,position=2,text='B')
        second=self.node('lesson', self.topic)
        NodePrerequisite.objects.create(target=second,source=self.lesson,threshold=70)
        LessonItem.objects.create(lesson=second,category='theory',format='image',asset=self.asset(),image_alt='Alt',position=1)
        CourseTask.objects.create(course=self.course,title='Hours',hours=2)
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        self.assertEqual(self.write('post','publish/').status_code,200)
        response=self.client.post(f'/api/courses/{self.course.pk}/versions/',{},format='json')
        self.assertEqual(response.status_code,201,response.content)
        draft=self.course.versions.get(pk=response.data['id'])
        self.assertEqual(draft.state,'draft'); self.assertEqual(draft.number,2)
        self.assertEqual(draft.nodes.count(),4)
        self.assertFalse(set(draft.nodes.values_list('id',flat=True)) & set(self.version.nodes.values_list('id',flat=True)))
        dep=NodePrerequisite.objects.get(target__version=draft)
        self.assertEqual(dep.source.version_id,draft.pk)
        self.assertEqual(dep.source.test.questions.get().options.count(),2)
        self.assertNotEqual(dep.source.test.pk,test.pk)
        self.assertEqual(LessonItem.objects.get(lesson__version=draft,format='image').asset_id,LessonItem.objects.get(lesson=second).asset_id)
        self.assertEqual(self.course.tasks.count(),1)
        self.error(self.client.post(f'/api/courses/{self.course.pk}/versions/',{},format='json'),409,'working_version_exists')

    def test_copy_failure_rolls_back_draft_and_all_copied_content(self):
        self.complete()
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        self.write('post','publish/')
        from learning import version_services
        from unittest import mock
        before=self.course.versions.count()
        with mock.patch('learning.version_services.LessonItem.objects.create',side_effect=RuntimeError('simulated')):
            with self.assertRaises(RuntimeError):
                version_services.copy_publication(self.owner,self.course.pk)
        self.assertEqual(self.course.versions.count(),before)
        self.assertEqual(self.version.nodes.count(),3)

    def test_failed_v2_publication_keeps_previous_pointer_and_instances(self):
        self.complete()
        Course.objects.filter(pk=self.course.pk).update(visibility='private')
        self.write('post','publish/')
        from learning import services, version_services
        from learning.content_services import etag
        from unittest import mock
        instance,_=services.join_course(self.owner,course_id=self.course.pk)
        draft=version_services.copy_publication(self.owner,self.course.pk)
        original=Course.save
        def fail(obj,*args,**kwargs):
            original(obj,*args,**kwargs)
            if obj.current_published_version_id==draft.pk:
                raise RuntimeError('simulated')
        with mock.patch.object(Course,'save',fail),self.assertRaises(RuntimeError):
            version_services.transition(self.owner,self.course.pk,draft.pk,etag(draft),'publish')
        self.course.refresh_from_db();draft.refresh_from_db();instance.refresh_from_db()
        self.assertEqual(self.course.current_published_version_id,self.version.pk)
        self.assertEqual(draft.state,'draft')
        self.assertEqual(instance.course_version_id,self.version.pk)
