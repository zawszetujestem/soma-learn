from learning.tests.content_helpers import ContentAPICase
from learning.tests.test_instance_version_pinning import assert_no_keys
from learning.models import Instance, LessonItem, NodeTest, TestQuestion, TestOption


class ContentPermissionsTests(ContentAPICase):
    def test_role_state_matrix_edit_read_and_student_preview(self):
        LessonItem.objects.create(lesson=self.lesson,category='practice',format='text',text='Task',answer_mode='keyed',answer_text='secret',position=1)
        test=NodeTest.objects.create(node=self.lesson)
        q=TestQuestion.objects.create(test=test,position=1,text='Q',type='single')
        TestOption.objects.create(question=q,position=1,text='A',is_correct=True)
        Instance.objects.create(course=self.course,course_version=self.version,student=self.student,mentor=self.other)
        for state in ['draft','rejected','submitted','published']:
            self.version.state=state;self.version.save()
            for user in [self.owner,self.admin,self.other,self.student,None]:
                self.client.force_authenticate(user)
                with self.subTest(state=state,user=user):
                    status=200 if user in [self.owner,self.admin] else 401 if user is None else 404
                    read=self.client.get(self.url)
                    self.assertEqual(read.status_code,status,read.content)
                    preview=self.client.get(self.url+'student-preview/')
                    self.assertEqual(preview.status_code,status,preview.content)
                    if status==200:
                        assert_no_keys(self,preview.data)
                        self.assertIn('secret',str(read.data))
                        write=self.write('patch','',{'title':'Title'})
                        if state in ['submitted','published']:
                            self.error(write,409,'invalid_version_state')
                        else: self.assertEqual(write.status_code,200)
                    else:
                        self.error(read,status,'not_authenticated' if status==401 else 'not_found')
                        self.error(preview,status,'not_authenticated' if status==401 else 'not_found')

    def test_asset_access_tracks_exact_instance_version_even_when_closed(self):
        response=self.upload()
        from learning.models import CourseAsset, CourseVersion, CourseNode
        asset=CourseAsset.objects.get(pk=response.data['id'])
        LessonItem.objects.create(lesson=self.lesson,category='theory',format='image',asset=asset,image_alt='Alt',position=1)
        instance=Instance.objects.create(course=self.course,course_version=self.version,student=self.student,mentor=self.other,status='closed')
        self.course.is_active=False;self.course.save()
        self.version.state='published';self.version.save()
        v2=CourseVersion.objects.create(course=self.course,number=2)
        section=CourseNode.objects.create(version=v2,kind='section',title='S',position=1)
        topic=CourseNode.objects.create(version=v2,kind='topic',title='T',parent=section,position=1)
        lesson=CourseNode.objects.create(version=v2,kind='lesson',title='L',parent=topic,position=1)
        LessonItem.objects.create(lesson=lesson,category='theory',format='image',asset=asset,image_alt='Alt',position=1)
        for user in [self.student,self.other]:
            self.client.force_authenticate(user)
            response=self.client.get(self.url+f'assets/{asset.pk}/download/')
            self.assertEqual(response.status_code,200)
            self.assertTrue(b''.join(response.streaming_content))
            self.error(self.client.get(f'/api/courses/{self.course.pk}/versions/{v2.pk}/assets/{asset.pk}/download/'),404,'not_found')
