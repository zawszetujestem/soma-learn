import json
from unittest import mock

from django.http import HttpResponse, JsonResponse
from django.test import Client, TestCase, RequestFactory, override_settings
from django.urls import path

from learning.tests.helpers import make_course, make_user
from rest_framework.test import APIClient
from rest_framework.exceptions import APIException

def plain_error(request, status):
    if status == 500:
        raise OSError('private-media/secret-file token')
    response = JsonResponse({'detail': 'Existing', 'field': ['bad']}, status=status)
    response['Retry-After'] = '12'
    return response


urlpatterns = [
    path('api/courses/plain/<int:status>/', plain_error),
    path('api/auth/plain/<int:status>/', plain_error),
]




class ErrorContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_user('errors-owner@example.com', 'mentor')
        self.student = make_user('errors-student@example.com', 'student')
        self.course = make_course(self.owner)

    def check_error(self, response, status, code):
        self.assertEqual(response.status_code, status)
        data = json.loads(response.content)
        self.assertIsInstance(data['message'], str)
        self.assertTrue(data['message'].strip())
        self.assertEqual(data['code'], code)
        if status >= 500:
            self.assertEqual(data['message'], 'Usługa jest chwilowo niedostępna.' if status == 503 else 'Wewnętrzny błąd serwera.')
        return data

    def test_auth_permissions_validation_missing_method_and_conflict(self):
        self.check_error(self.client.get('/api/courses/'), 401, 'not_authenticated')
        self.client.credentials(HTTP_AUTHORIZATION='Token invalid')
        self.check_error(self.client.get('/api/courses/'), 401, 'authentication_failed')
        self.client.credentials()
        self.client.force_authenticate(self.student)
        self.check_error(self.client.post('/api/courses/', {}, format='json'), 403, 'forbidden')
        self.check_error(self.client.get('/api/courses/999999/'), 404, 'not_found')
        self.check_error(self.client.patch('/api/instances/999999/', {}, format='json'), 405, 'method_not_allowed')
        self.client.force_authenticate(self.owner)
        fields = self.check_error(self.client.post('/api/courses/', {'title': 'x' * 201, 'visibility': 'public'}, format='json'), 400, 'validation_error')
        self.assertIn('title', fields)
        domain = self.check_error(self.client.post(f'/api/courses/{self.course.pk}/resubmit/'), 409, 'course_not_rejected')
        self.assertIn('detail', domain)

    def test_parse_and_unsupported_media_type(self):
        self.client.force_authenticate(self.owner)
        self.check_error(self.client.post('/api/courses/', '{broken', content_type='application/json'), 400, 'parse_error')
        self.check_error(self.client.post('/api/courses/', 'abc', content_type='application/unknown'), 415, 'unsupported_media_type')

    def test_unhandled_and_controlled_5xx_are_generic_even_in_debug(self):
        self.client.force_authenticate(self.owner)
        self.client.raise_request_exception = False
        for exception in (RuntimeError('/private/secret token'), APIException('/private/secret token')):
            with self.subTest(exception=type(exception)), override_settings(DEBUG=True), mock.patch('learning.services.public_courses', side_effect=exception):
                response = self.client.get('/api/courses/')
                self.check_error(response, 500, 'internal_error')
                self.assertNotIn('secret', response.content.decode())
                self.assertNotIn('/private/', response.content.decode())

    def test_namespace_resolver_errors_and_other_apps_unchanged(self):
        for family in ('courses', 'instances', 'course-scopes', 'course-subjects', 'course-moderation'):
            with self.subTest(family=family), override_settings(DEBUG=True):
                self.check_error(self.client.get(f'/api/{family}/missing/'), 404, 'not_found')
        self.assertNotEqual(self.client.get('/api/auth/missing/')['Content-Type'], 'application/json')
        self.assertNotEqual(self.client.get('/api/courses-other/')['Content-Type'], 'application/json')

    def test_non_drf_fallback_preserves_fields_status_and_headers(self):
        from learning.middleware import LearningErrorMiddleware
        factory = RequestFactory()
        for status, code in ((403, 'forbidden'), (413, 'request_too_large'), (429, 'throttled'), (503, 'service_unavailable')):
            with self.subTest(status=status):
                response = JsonResponse({'detail': 'Existing', 'field': ['bad']}, status=status)
                response['Retry-After'] = '12'
                result = LearningErrorMiddleware(lambda request: response)(factory.get('/api/courses/'))
                data = self.check_error(result, status, code)
                self.assertEqual(result['Retry-After'], '12')
                if status < 500:
                    self.assertEqual(data['field'], ['bad'])
                else:
                    self.assertNotIn('Existing', result.content.decode())
        response = HttpResponse('sensitive html', status=500)
        result = LearningErrorMiddleware(lambda request: response)(factory.get('/api/instances/'))
        self.check_error(result, 500, 'internal_error')
        self.assertNotIn('sensitive', result.content.decode())

    @override_settings(ROOT_URLCONF=__name__, DEBUG=True)
    def test_real_non_drf_http_responses_and_exception_are_safe(self):
        client = Client(raise_request_exception=False)
        for status, code in ((413, 'request_too_large'), (429, 'throttled'), (500, 'internal_error'), (503, 'service_unavailable')):
            with self.subTest(status=status):
                response = client.get(f'/api/courses/plain/{status}/')
                self.check_error(response, status, code)
                self.assertNotIn('secret', response.content.decode())
                if status != 500:
                    self.assertEqual(response['Retry-After'], '12')
        other = client.get('/api/auth/plain/413/')
        self.assertNotIn('message', other.json())
        self.assertNotIn('code', other.json())

    @override_settings(ROOT_URLCONF=__name__, DEBUG=True)
    def test_real_csrf_failure_contract_is_scoped(self):
        client = Client(enforce_csrf_checks=True)
        self.check_error(client.post('/api/courses/plain/403/', {}), 403, 'csrf_failed')
        other = client.post('/api/auth/plain/403/', {})
        self.assertEqual(other.status_code, 403)
        self.assertNotEqual(other['Content-Type'], 'application/json')

    def test_drf_session_csrf_failure_code(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.owner)
        self.check_error(client.post('/api/courses/', {}, format='json'), 403, 'csrf_failed')
