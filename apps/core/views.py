from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render


def home(request: HttpRequest) -> HttpResponse:
    return render(request, "core/home.html")


def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})
