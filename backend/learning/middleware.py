"""Fallback for resolver, CSRF, upload and other non-DRF learning errors."""
import json

from django.http import JsonResponse

from .api_errors import error_payload, is_learning_request


class LearningErrorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not is_learning_request(request) or response.status_code < 400:
            return response
        data = None
        if not response.streaming and response.get('Content-Type', '').split(';')[0] == 'application/json':
            try:
                data = json.loads(response.content)
            except (ValueError, UnicodeError):
                pass
        payload = error_payload(data, response.status_code)
        if response.streaming:
            # Never stream an error document or a partial private file.
            replacement = JsonResponse(payload, status=response.status_code)
            for key, value in response.items():
                if key.lower() not in ('content-type', 'content-length', 'content-disposition', 'content-encoding'):
                    replacement[key] = value
            replacement.cookies = response.cookies
            response.close()
            return replacement
        response.content = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        response['Content-Type'] = 'application/json'
        if 'Content-Length' in response:
            response['Content-Length'] = str(len(response.content))
        if hasattr(response, 'data'):
            response.data = payload
        return response

    def process_exception(self, request, exception):
        if is_learning_request(request):
            return JsonResponse(error_payload(None, 500), status=500)
        return None
