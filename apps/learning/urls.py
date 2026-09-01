from django.urls import path

from . import views

app_name = "learning"

urlpatterns = [
    path("courses/", views.CourseListView.as_view(), name="course-list"),
    path("courses/<int:pk>/", views.CourseEntryView.as_view(), name="course-entry"),
]
