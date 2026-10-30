from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import CourseTask, InstanceTask
from .permissions import IsCourseManager
from .serializers import (
    CourseSerializer,
    CourseCreateSerializer,
    CourseIdentitySerializer,
    CourseTaskSerializer,
    InstanceSerializer,
    InstanceTaskSerializer,
    InstanceTaskStatusSerializer,
    ManageCourseSerializer,
    StudentsCountSerializer,
)

AUTHENTICATION_CLASSES = [TokenAuthentication, SessionAuthentication]
MANAGER_PERMISSIONS = [IsAuthenticated, IsCourseManager]


class CourseListCreateView(generics.ListCreateAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCourseManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return services.public_courses().prefetch_related('tasks')

    @extend_schema(request=CourseCreateSerializer, responses={201: ManageCourseSerializer})
    def create(self, request, *args, **kwargs):
        serializer = CourseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = services.create_course(request.user, **serializer.validated_data)
        return Response(ManageCourseSerializer(course).data, status=status.HTTP_201_CREATED)


class CourseMineListView(generics.ListAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS
    serializer_class = ManageCourseSerializer

    def get_queryset(self):
        return services.owned_courses(self.request.user).prefetch_related('tasks')


class CourseMineDetailView(generics.RetrieveAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS
    serializer_class = ManageCourseSerializer

    def get_queryset(self):
        return services.owned_courses(self.request.user).prefetch_related('tasks')


class CourseStudentsCountView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS

    @extend_schema(request=None, responses=StudentsCountSerializer)
    def get(self, request, pk):
        course = services.get_owned_course(request.user, pk)
        count = services.count_active_students(course, request.user)
        return Response({'count': count})


class CourseDetailView(generics.RetrieveUpdateAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    serializer_class = CourseSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [permission() for permission in MANAGER_PERMISSIONS]
        return [IsAuthenticated()]

    def get_queryset(self):
        if self.request.method == 'PATCH':
            return services.owned_courses(self.request.user).prefetch_related('tasks')
        return services.visible_courses(self.request.user).prefetch_related('tasks')

    @extend_schema(request=CourseIdentitySerializer, responses=ManageCourseSerializer)
    def partial_update(self, request, *args, **kwargs):
        course = self.get_object()
        serializer = CourseIdentitySerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        course = services.update_course(course, serializer.validated_data)
        return Response(ManageCourseSerializer(course).data)


class CourseResubmitView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS

    @extend_schema(request=None, responses=ManageCourseSerializer)
    def post(self, request, pk):
        course = services.get_owned_course(request.user, pk)
        version = services.resubmit_course(course, request.user, request.headers.get('If-Match'))
        from .content_services import etag
        response = Response(ManageCourseSerializer(course).data)
        response['ETag'] = etag(version)
        return response


class CourseRegenerateTokenView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS

    @extend_schema(request=None, responses=ManageCourseSerializer)
    def post(self, request, pk):
        course = services.get_owned_course(request.user, pk)
        course = services.regenerate_invite_token(course)
        return Response(ManageCourseSerializer(course).data)


class CourseJoinView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=InstanceSerializer, operation_id='courses_join_by_id_create')
    def post(self, request, pk):
        instance, created = services.join_course(request.user, course_id=pk)
        return Response(
            InstanceSerializer(instance).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CourseJoinByTokenView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=InstanceSerializer, operation_id='courses_join_by_token_create')
    def post(self, request, token):
        instance, created = services.join_by_token(request.user, token)
        return Response(
            InstanceSerializer(instance).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CourseTaskCreateView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS

    @extend_schema(request=CourseTaskSerializer, responses=CourseTaskSerializer)
    def post(self, request, pk):
        course = services.get_owned_course(request.user, pk)
        serializer = CourseTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            course = services.Course.objects.select_for_update().get(pk=course.pk)
            serializer.save(course=course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CourseTaskDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = MANAGER_PERMISSIONS
    serializer_class = CourseTaskSerializer
    http_method_names = ['patch', 'delete', 'head', 'options']
    lookup_url_kwarg = 'task_pk'

    def get_queryset(self):
        return CourseTask.objects.filter(
            course_id=self.kwargs['pk'],
            course__owner=self.request.user,
        )

    def perform_update(self, serializer):
        with transaction.atomic():
            services.Course.objects.select_for_update().get(pk=serializer.instance.course_id)
            serializer.save()

    def perform_destroy(self, instance):
        with transaction.atomic():
            services.Course.objects.select_for_update().get(pk=instance.course_id)
            instance.delete()


class InstanceListView(generics.ListAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    serializer_class = InstanceSerializer

    def get_queryset(self):
        return services.readable_instances(self.request.user).select_related('course').prefetch_related('tasks')


class InstanceDetailView(generics.RetrieveAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    serializer_class = InstanceSerializer

    def get_queryset(self):
        return services.readable_instances(self.request.user).select_related('course').prefetch_related('tasks')


class InstanceTaskStatusView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    @extend_schema(request=InstanceTaskStatusSerializer, responses=InstanceTaskSerializer)
    def patch(self, request, pk, task_pk):
        instance = services.get_readable_instance(request.user, pk)
        serializer = InstanceTaskStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = InstanceTask.objects.filter(pk=task_pk, instance=instance).first()
        if task is None:
            raise services.not_found()
        task = services.change_instance_task_status(
            request.user, instance, task, serializer.validated_data['status'],
        )
        return Response(InstanceTaskSerializer(task).data)


class InstanceCloseView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=InstanceSerializer)
    def post(self, request, pk):
        instance = services.get_readable_instance(request.user, pk)
        instance = services.close_instance(request.user, instance)
        return Response(InstanceSerializer(instance).data)


class InstanceResumeView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=InstanceSerializer)
    def post(self, request, pk):
        instance = services.get_readable_instance(request.user, pk)
        instance = services.resume_instance(request.user, instance)
        return Response(InstanceSerializer(instance).data)
