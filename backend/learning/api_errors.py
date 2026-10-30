"""Additive error contract restricted to learning's API families."""
from rest_framework.response import Response
from rest_framework.views import exception_handler as default_exception_handler

API_FAMILIES = ('courses', 'instances', 'course-scopes', 'course-subjects', 'course-moderation')
STATUS_CODES = {
    400: 'validation_error', 401: 'not_authenticated', 403: 'forbidden',
    404: 'not_found', 405: 'method_not_allowed', 409: 'conflict',
    413: 'request_too_large', 415: 'unsupported_media_type', 429: 'throttled',
    500: 'internal_error', 503: 'service_unavailable',
}


def is_learning_request(request):
    path = getattr(request, 'path_info', '')
    return any(path == f'/api/{family}' or path.startswith(f'/api/{family}/') for family in API_FAMILIES)


def _text(value):
    if isinstance(value, str) and value.strip():
        return str(value)
    if isinstance(value, dict):
        return next((text for item in value.values() if (text := _text(item))), None)
    if isinstance(value, (list, tuple)):
        return next((text for item in value if (text := _text(item))), None)
    return None


def error_payload(data, status, code=None):
    if status >= 500:
        return {
            'message': 'Usługa jest chwilowo niedostępna.' if status == 503 else 'Wewnętrzny błąd serwera.',
            'code': 'service_unavailable' if status == 503 else 'internal_error',
        }
    result = dict(data) if isinstance(data, dict) else {'detail': data}
    if not isinstance(result.get('message'), str) or not result['message'].strip():
        result['message'] = _text(result.get('detail')) or _text(data) or 'Nie udało się wykonać operacji.'
    if not isinstance(result.get('code'), str) or not result['code'].strip():
        result['code'] = code or STATUS_CODES.get(status, 'request_error')
    return result


def exception_handler(exc, context):
    response = default_exception_handler(exc, context)
    if not is_learning_request(context.get('request')):
        return response
    if response is None:
        # Do not expose exception strings, paths or DEBUG tracebacks.
        from rest_framework.views import set_rollback
        set_rollback()
        return Response(error_payload(None, 500), status=500)
    code = getattr(exc, 'default_code', None)
    # DomainError already carries its own code; PermissionDenied maps to forbidden.
    if code == 'invalid':
        code = 'validation_error'
    if code == 'permission_denied':
        # SessionAuthentication uses PermissionDenied for failed CSRF checks.
        code = 'csrf_failed' if str(getattr(exc, 'detail', '')).startswith('CSRF Failed:') else 'forbidden'
    response.data = error_payload(response.data, response.status_code, code)
    return response


def csrf_failure(request, reason=''):
    from django.http import JsonResponse
    from django.views.csrf import csrf_failure as default_csrf_failure
    if is_learning_request(request):
        return JsonResponse(error_payload({'detail': 'Weryfikacja CSRF nie powiodła się.'}, 403, 'csrf_failed'), status=403)
    return default_csrf_failure(request, reason=reason)
