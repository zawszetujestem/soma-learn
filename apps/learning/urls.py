from django.urls import path

from . import views

app_name = "learning"

urlpatterns = [
    path("courses/", views.CourseListView.as_view(), name="course-list"),
    path("courses/new/", views.CourseCreateView.as_view(), name="course-create"),
    path("courses/<int:pk>/", views.CourseEntryView.as_view(), name="course-entry"),
    path("courses/<int:pk>/edit/", views.CourseUpdateView.as_view(), name="course-edit"),
    path("courses/<int:pk>/delete/", views.CourseDeleteView.as_view(), name="course-delete"),
    path(
        "courses/<int:pk>/instances/new/",
        views.CourseInstanceCreateView.as_view(),
        name="course-instance-create",
    ),
    path(
        "invitations/<str:token>/",
        views.InvitationAcceptView.as_view(),
        name="invitation-accept",
    ),
]
