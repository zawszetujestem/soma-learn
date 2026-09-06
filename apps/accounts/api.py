import json
from typing import Any

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .forms import RegistrationForm
from .models import User


def _user_payload(user: User) -> dict[str, Any]:
    return {
        "email": user.email,
        "is_mentor": user.is_mentor,
        "is_student": user.is_student,
    }


@ensure_csrf_cookie
@require_GET
def csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "CSRF cookie set."})


@require_POST
def login_view(request: HttpRequest) -> JsonResponse:
    try:
        data = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    email = data.get("email", "")
    password = data.get("password", "")
    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"detail": "Nieprawidłowy e-mail lub hasło."}, status=401)

    login(request, user)
    return JsonResponse({"user": _user_payload(user)})


@require_POST
def register_view(request: HttpRequest) -> JsonResponse:
    try:
        data = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    form = RegistrationForm(
        {
            "email": data.get("email", ""),
            "password1": data.get("password1", ""),
            "password2": data.get("password2", ""),
            "role": data.get("role", "student"),
        }
    )
    if not form.is_valid():
        return JsonResponse({"errors": form.errors.get_json_data()}, status=400)

    user = form.save()
    login(request, user)
    return JsonResponse({"user": _user_payload(user)}, status=201)


@login_required
@require_POST
def logout_view(request: HttpRequest) -> JsonResponse:
    logout(request)
    return JsonResponse({"detail": "Logged out."})


@require_GET
def me(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated."}, status=401)
    return JsonResponse({"user": _user_payload(request.user)})
