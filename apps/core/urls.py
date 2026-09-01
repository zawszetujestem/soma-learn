from django.urls import path

from .views import health_check

app_name = "core"

urlpatterns = [
    path("healthz/", health_check, name="health-check"),
]
