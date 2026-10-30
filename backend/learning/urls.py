from django.urls import path

from . import views

urlpatterns = [
    path('courses/', views.CourseListCreateView.as_view(), name='course-list'),
    path('courses/mine/', views.CourseMineListView.as_view(), name='course-mine-list'),
    path('courses/mine/<int:pk>/', views.CourseMineDetailView.as_view(), name='course-mine-detail'),
    path(
        'courses/mine/<int:pk>/students-count/',
        views.CourseStudentsCountView.as_view(),
        name='course-students-count',
    ),
    path('courses/join/<str:token>/', views.CourseJoinByTokenView.as_view(), name='course-join-token'),
    path('courses/<int:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('courses/<int:pk>/resubmit/', views.CourseResubmitView.as_view(), name='course-resubmit'),
    path(
        'courses/<int:pk>/regenerate-token/',
        views.CourseRegenerateTokenView.as_view(),
        name='course-regenerate-token',
    ),
    path('courses/<int:pk>/join/', views.CourseJoinView.as_view(), name='course-join'),
    path('courses/<int:pk>/tasks/', views.CourseTaskCreateView.as_view(), name='course-task-create'),
    path(
        'courses/<int:pk>/tasks/<int:task_pk>/',
        views.CourseTaskDetailView.as_view(),
        name='course-task-detail',
    ),
    path('instances/', views.InstanceListView.as_view(), name='instance-list'),
    path('instances/<int:pk>/', views.InstanceDetailView.as_view(), name='instance-detail'),
    path(
        'instances/<int:pk>/tasks/<int:task_pk>/',
        views.InstanceTaskStatusView.as_view(),
        name='instance-task-status',
    ),
    path('instances/<int:pk>/close/', views.InstanceCloseView.as_view(), name='instance-close'),
    path('instances/<int:pk>/resume/', views.InstanceResumeView.as_view(), name='instance-resume'),
]
