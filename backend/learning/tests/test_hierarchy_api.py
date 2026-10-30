from learning.models import CourseVersion, CourseNode, CourseScope, CourseSubject
from learning.tests.content_helpers import ContentAPICase


class HierarchyAPITests(ContentAPICase):
    def test_create_patch_delete_and_etag(self):
        response = self.write('post', 'nodes/', {'kind': 'section', 'title': 'New'})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['position'], 2)
        self.assertEqual(response['ETag'], f'"v{self.version.pk}-r2"')
        pk = response.data['id']
        self.assertEqual(
            self.write('patch', f'nodes/{pk}/', {'title': 'Renamed'}).data['title'],
            'Renamed',
        )
        self.assertEqual(self.write('delete', f'nodes/{pk}/').status_code, 204)
        self.assertFalse(CourseNode.objects.filter(pk=pk).exists())

    def test_invalid_parent_and_immutable_fields(self):
        for data in (
            {'kind': 'lesson', 'title': 'x'},
            {'kind': 'topic', 'parent_id': self.lesson.pk, 'title': 'x'},
        ):
            self.error(self.write('post', 'nodes/', data), 400, 'invalid_parent')
        self.error(
            self.write(
                'patch', f'nodes/{self.lesson.pk}/', {'parent_id': self.topic.pk}
            ),
            400,
            'parent_immutable',
        )
        self.error(
            self.write('patch', f'nodes/{self.lesson.pk}/', {'kind': 'topic'}),
            400,
            'validation_error',
        )
        other = CourseVersion.objects.create(
            course=self.course, number=2, state='published'
        )
        foreign = CourseNode.objects.create(
            version=other, kind='section', title='foreign', position=1
        )
        self.error(
            self.write(
                'post',
                'nodes/',
                {'kind': 'topic', 'parent_id': foreign.pk, 'title': 'x'},
            ),
            400,
            'invalid_parent',
        )
        self.error(
            self.write('patch', f'nodes/{foreign.pk}/', {'title': 'x'}),
            404,
            'not_found',
        )

    def test_move_swaps_and_boundary_has_no_revision_change(self):
        response = self.write(
            'post', f'nodes/{self.section.pk}/move/', {'direction': 'up'}
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['moved'])
        self.version.refresh_from_db()
        self.assertEqual(self.version.revision, 1)
        second = self.node('section')
        response = self.write('post', f'nodes/{second.pk}/move/', {'direction': 'up'})
        self.assertTrue(response.data['moved'])
        self.assertEqual(
            list(self.version.nodes.filter(parent=None).values_list('pk', flat=True)),
            [second.pk, self.section.pk],
        )

    def test_auth_state_and_revisions(self):
        self.error(
            self.client.patch(self.url, {'title': 'x'}, format='json'),
            400,
            'revision_required',
        )
        self.error(
            self.write('patch', data={'title': 'x'}, HTTP_IF_MATCH='"old"'),
            409,
            'stale_revision',
        )
        for state in ('published', 'submitted'):
            self.version.state = state
            self.version.save()
            self.error(
                self.write('post', 'nodes/', {'kind': 'section', 'title': 'x'}),
                409,
                'invalid_version_state',
            )
        self.version.state = 'rejected'
        self.version.save()
        self.assertEqual(self.write('patch', data={'title': 'x'}).status_code, 200)
        for user, status, code in (
            (None, 401, 'not_authenticated'),
            (self.other, 404, 'not_found'),
            (self.student, 404, 'not_found'),
        ):
            self.client.force_authenticate(user)
            self.error(self.client.get(self.url), status, code)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.write('patch', data={'title': 'Admin'}).status_code, 200)

    def test_version_projection_and_classification(self):
        scope = CourseScope.objects.create(name='Active')
        inactive = CourseScope.objects.create(name='Inactive', is_active=False)
        CourseSubject.objects.create(name='Subject')
        data = self.client.get(self.url).data
        self.assertEqual(data['course_owner'], self.owner.pk)
        self.assertEqual(data['course_visibility'], 'public')
        self.assertTrue(data['course_is_active'])
        self.assertEqual(
            data['nodes'][0]['children'][0]['children'][0]['id'], self.lesson.pk
        )
        self.error(
            self.write('patch', data={'scope_id': inactive.pk}),
            400,
            'classification_invalid',
        )
        self.assertEqual(
            self.write('patch', data={'scope_id': scope.pk}).data['scope']['id'],
            scope.pk,
        )
        self.assertEqual(
            [x['id'] for x in self.client.get('/api/course-scopes/').data], [scope.pk]
        )
        self.assertEqual(self.client.get(self.url + 'validation/').status_code, 200)
        self.assertFalse(self.client.get(self.url + 'validation/').data['valid'])
        self.error(
            self.client.put(self.url, {}, format='json'), 405, 'method_not_allowed'
        )

    def test_all_version_writes_enforce_revision_state_and_permissions(self):
        calls = [
            ('patch', '', {'title': 'X'}),
            ('post', 'nodes/', {'kind': 'section', 'title': 'S'}),
            ('patch', f'nodes/{self.lesson.pk}/', {'title': 'L'}),
            ('delete', f'nodes/{self.lesson.pk}/', {}),
            ('post', f'nodes/{self.lesson.pk}/move/', {'direction': 'up'}),
            (
                'put',
                f'nodes/{self.lesson.pk}/prerequisite/',
                {'source_id': self.section.pk, 'threshold': 70},
            ),
            ('delete', f'nodes/{self.lesson.pk}/prerequisite/', {}),
            ('post', f'nodes/{self.lesson.pk}/test/', {}),
            ('put', f'nodes/{self.lesson.pk}/test/', {'questions': []}),
            ('delete', f'nodes/{self.lesson.pk}/test/', {}),
            (
                'post',
                f'lessons/{self.lesson.pk}/items/',
                {'category': 'practice', 'format': 'text', 'text': 'T'},
            ),
        ]
        for method, path, data in calls:
            with self.subTest(method=method, path=path):
                self.error(
                    getattr(self.client, method)(self.url + path, data, format='json'),
                    400,
                    'revision_required',
                )
                self.error(
                    self.write(method, path, data, HTTP_IF_MATCH='"stale"'),
                    409,
                    'stale_revision',
                )
                self.version.state = 'submitted'
                self.version.save()
                self.error(self.write(method, path, data), 409, 'invalid_version_state')
                self.version.state = 'draft'
                self.version.save()
                self.client.force_authenticate(self.other)
                self.error(self.write(method, path, data), 404, 'not_found')
                self.client.force_authenticate(None)
                self.error(self.write(method, path, data), 401, 'not_authenticated')
                self.client.force_authenticate(self.owner)

    def test_validation_can_be_fully_valid_and_is_side_effect_free(self):
        from learning.models import LessonItem

        scope = CourseScope.objects.create(name='Scope')
        subject = CourseSubject.objects.create(name='Subject')
        self.version.scope = scope
        self.version.subject = subject
        self.version.save()
        LessonItem.objects.create(
            lesson=self.lesson,
            category='practice',
            format='text',
            text='Task',
            position=1,
        )
        response = self.client.get(self.url + 'validation/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'valid': True, 'issues': []})
        self.version.refresh_from_db()
        self.assertEqual(self.version.state, 'draft')
        self.assertEqual(self.version.revision, 1)

    def test_cors_allows_revision_header_and_exposes_etag(self):
        from django.conf import settings

        origin = settings.CORS_ALLOWED_ORIGINS[0]
        response = self.client.options(
            self.url,
            HTTP_ORIGIN=origin,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='PATCH',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='if-match,authorization',
        )
        self.assertIn('if-match', response['Access-Control-Allow-Headers'].lower())
        response = self.client.get(self.url, HTTP_ORIGIN=origin)
        self.assertIn('etag', response.get('Access-Control-Expose-Headers', '').lower())
