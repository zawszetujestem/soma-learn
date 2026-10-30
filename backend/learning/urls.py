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


# Versioned content authoring and lifecycle.
from . import content_views as content
from .models import CourseSubject

V = 'courses/<int:course_id>/versions/<int:version_id>/'
urlpatterns += [
    path('course-scopes/', content.DictionaryView.as_view(), name='course-scopes'),
    path('course-subjects/', content.DictionaryView.as_view(model=CourseSubject), name='course-subjects'),
    path('courses/<int:course_id>/versions/', content.VersionListView.as_view(), name='version-list'),
    path(V, content.VersionView.as_view(), name='version-detail'),
    path(V+'validation/', content.VersionProjectionView.as_view(projection='validation'), name='version-validation'),
    path(V+'student-preview/', content.VersionProjectionView.as_view(), name='version-student-preview'),
    path(V+'nodes/', content.NodeCreateView.as_view(), name='node-create'),
    path(V+'nodes/<int:node_id>/', content.NodeDetailView.as_view(), name='node-detail'),
    path(V+'nodes/<int:node_id>/move/', content.NodeMoveView.as_view(), name='node-move'),
    path(V+'nodes/<int:node_id>/prerequisite/', content.PrerequisiteView.as_view(), name='node-prerequisite'),
    path(V+'nodes/<int:node_id>/test/', content.NodeTestView.as_view(), name='node-test'),
    path(V+'lessons/<int:lesson_id>/items/', content.ItemCreateView.as_view(), name='item-create'),
    path(V+'lessons/<int:lesson_id>/items/<int:item_id>/', content.ItemDetailView.as_view(), name='item-detail'),
    path(V+'lessons/<int:lesson_id>/items/<int:item_id>/move/', content.ItemMoveView.as_view(), name='item-move'),
    path(V+'assets/', content.AssetUploadView.as_view(), name='asset-upload'),
    path(V+'assets/<uuid:asset_id>/download/', content.AssetDownloadView.as_view(), name='asset-download'),
    path('courses/<int:course_id>/assets/', content.AssetListView.as_view(), name='asset-list'),
    path('courses/<int:course_id>/assets/<uuid:asset_id>/', content.AssetDeleteView.as_view(), name='asset-delete'),
]

urlpatterns += [
    path('course-moderation/', content.ModerationView.as_view(), name='course-moderation'),
    path('instances/<int:pk>/content/', content.InstanceContentView.as_view(), name='instance-content'),
]
for operation in ('submit', 'withdraw', 'publish', 'accept', 'reject'):
    urlpatterns.append(path(V + operation + '/', content.VersionTransitionView.as_view(operation=operation), name='version-' + operation))
