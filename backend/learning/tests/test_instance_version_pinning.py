from learning.tests.content_helpers import ContentAPICase
from learning.tests import test_version_lifecycle as lifecycle
from learning.models import Course, Instance, LessonItem, NodeTest, TestQuestion, TestOption
from learning import services


def assert_no_keys(case, value):
    if isinstance(value, dict):
        case.assertFalse({'answer_text','is_correct'} & set(value))
        for child in value.values(): assert_no_keys(case,child)
    elif isinstance(value,list):
        for child in value: assert_no_keys(case,child)


class InstancePinningTests(ContentAPICase):
    complete = lifecycle.VersionLifecycleTests.complete
    def test_v2_publish_and_resume_preserve_v1_and_plan(self):
        self.complete()
        Course.objects.filter(pk=self.course.pk).update(visibility='private',invite_token='test-token')
        self.write('post','publish/')
        self.course.refresh_from_db()
        instance,_=services.join_by_token(self.student,self.course.invite_token)
        first=instance.course_version_id
        response=self.client.post(f'/api/courses/{self.course.pk}/versions/',{},format='json')
        url=f"/api/courses/{self.course.pk}/versions/{response.data['id']}/"
        detail=self.client.get(url)
        result=self.client.post(url+'publish/',{},format='json',HTTP_IF_MATCH=detail['ETag'])
        self.assertEqual(result.status_code,200,result.content)
        same,created=services.join_by_token(self.student,self.course.invite_token)
        self.assertFalse(created); self.assertEqual(same.course_version_id,first)
        services.close_instance(self.owner,instance)
        resumed=services.resume_instance(self.owner,instance)
        self.assertEqual(resumed.course_version_id,first)
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(f'/api/instances/{instance.pk}/').data['course_version'],first)

    def test_content_role_matrix_closed_inactive_and_historical_unpublished(self):
        self.complete()
        LessonItem.objects.create(lesson=self.lesson,category='practice',format='text',text='Task',answer_mode='keyed',answer_text='secret',position=1)
        test=NodeTest.objects.create(node=self.lesson)
        q=TestQuestion.objects.create(test=test,position=1,text='Q',type='single')
        TestOption.objects.create(question=q,position=1,text='A',is_correct=True)
        instance=Instance.objects.create(course=self.course,course_version=self.version,student=self.student,mentor=self.other,status='closed')
        Course.objects.filter(pk=self.course.pk).update(is_active=False)
        url=f'/api/instances/{instance.pk}/content/'
        stranger=__import__('learning.tests.helpers',fromlist=['make_user']).make_user('stranger@example.com','mentor')
        for user,status in [(self.student,200),(self.other,200),(self.owner,200),(self.admin,200),(stranger,404),(None,401)]:
            self.client.force_authenticate(user)
            response=self.client.get(url)
            self.assertEqual(response.status_code,status,response.content)
            if status==200:
                self.assertEqual(response.data['id'],self.version.pk)
                if user in [self.student,self.other]: assert_no_keys(self,response.data)
                else: self.assertIn('secret',str(response.data))
            else: self.error(response,status,'not_found' if status==404 else 'not_authenticated')

    def test_no_fallback_to_draft_on_join(self):
        response=self.client.post(f'/api/courses/{self.course.pk}/join/',{},format='json')
        self.error(response,409,'course_not_approved')
        self.assertIn('brak opublikowanej wersji',response.data['message'].lower())
        self.assertFalse(Instance.objects.exists())
