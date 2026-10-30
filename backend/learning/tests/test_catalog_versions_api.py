from learning.tests.content_helpers import ContentAPICase
from learning.tests import test_version_lifecycle as lifecycle
from learning.models import Course


class CatalogVersionsTests(ContentAPICase):
    complete = lifecycle.VersionLifecycleTests.complete
    def test_new_courses_are_draft_for_mentor_private_and_admin(self):
        for user,visibility in [(self.owner,'public'),(self.owner,'private'),(self.admin,'public')]:
            self.client.force_authenticate(user)
            response=self.client.post('/api/courses/',{'visibility':visibility},format='json')
            self.assertEqual(response.status_code,201,response.content)
            course=Course.objects.get(pk=response.data['id'])
            self.assertIsNone(course.current_published_version_id)
            self.assertEqual(response.data['working_version']['state'],'draft')
        self.error(self.client.post('/api/courses/',{'visibility':'private'},format='json'),403,'forbidden')

    def test_catalog_uses_only_publication_and_program_has_no_content(self):
        self.complete()
        self.write('post','submit/')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.write('post','accept/').status_code,200)
        self.client.force_authenticate(self.owner)
        response=self.client.post(f'/api/courses/{self.course.pk}/versions/',{},format='json')
        self.assertEqual(response.status_code,201,response.content)
        self.course.versions.filter(pk=response.data['id']).update(title='Secret draft')
        Course.objects.filter(pk=self.course.pk).update(title='Legacy',approval_status='rejected')
        for user in [self.owner,self.student,self.other,self.admin]:
            self.client.force_authenticate(user)
            detail=self.client.get(f'/api/courses/{self.course.pk}/')
            self.assertEqual(detail.status_code,200)
            self.assertEqual(detail.data['title'],'Draft')
            program=detail.data['program']
            self.assertEqual(set(program[0]),{'id','kind','title','position','children'})
            self.assertNotIn('theory',str(program)); self.assertNotIn('test',str(program))
            self.assertEqual(self.client.get('/api/courses/').data[0]['title'],'Draft')

    def test_unpublished_detail_hidden_even_from_owner_and_patch_is_identity_only(self):
        self.error(self.client.get(f'/api/courses/{self.course.pk}/'),404,'not_found')
        for data,code in [({'title':'No'},'version_fields_required'),({'description':'No'},'version_fields_required'),({'visibility':'private'},'visibility_immutable')]:
            self.error(self.client.patch(f'/api/courses/{self.course.pk}/',data,format='json'),400,code)
        response=self.client.patch(f'/api/courses/{self.course.pk}/',{'is_active':False},format='json')
        self.assertEqual(response.status_code,200)
        self.assertFalse(response.data['is_active'])

    def test_catalog_query_count_is_constant_and_never_loads_full_content(self):
        from learning.tests.helpers import make_course
        from learning import services
        from learning.serializers import CourseSerializer
        from django.test.utils import CaptureQueriesContext
        from django.db import connection
        for i in range(4):
            make_course(self.owner,title=f'Course {i}')
        with CaptureQueriesContext(connection) as queries:
            data=CourseSerializer(services.public_courses(),many=True).data
        self.assertEqual(len(data),4)
        self.assertLessEqual(len(queries),3)
        for query in queries:
            sql=query['sql'].lower()
            self.assertNotIn('learning_lessonitem',sql)
            self.assertNotIn('learning_nodetest',sql)
            self.assertNotIn('learning_courseasset',sql)
