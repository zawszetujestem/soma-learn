from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import lesson_cycle_services as cycles, services
from .lesson_cycle_serializers import (
    LessonCycleCreateSerializer, LessonCycleLessonSerializer, LessonCycleProjectionSerializer,
    LessonCycleUpdateSerializer,
)
from .views import AUTHENTICATION_CLASSES


class LessonCycleView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    def readable_instance(self, request, pk):
        return services.get_readable_instance(request.user, pk)


class LessonCycleListView(LessonCycleView):
    @extend_schema(responses=LessonCycleProjectionSerializer)
    def get(self, request, pk):
        return Response(cycles.projection(self.readable_instance(request, pk)))

    @extend_schema(request=LessonCycleCreateSerializer, responses={201: LessonCycleProjectionSerializer})
    def post(self, request, pk):
        self.readable_instance(request, pk)
        serializer = LessonCycleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(cycles.create(request.user, pk, **serializer.validated_data), status=201)


class LessonCycleStartView(LessonCycleView):
    @extend_schema(request=None, responses=LessonCycleProjectionSerializer)
    def post(self, request, pk, cycle_id):
        return Response(cycles.start(request.user, pk, cycle_id))


class LessonCycleDetailView(LessonCycleView):
    @extend_schema(request=LessonCycleUpdateSerializer, responses=LessonCycleProjectionSerializer)
    def patch(self, request, pk, cycle_id):
        self.readable_instance(request, pk)
        serializer = LessonCycleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(cycles.update(request.user, pk, cycle_id, **serializer.validated_data))


class LessonCycleCloseView(LessonCycleView):
    @extend_schema(request=None, responses=LessonCycleProjectionSerializer)
    def post(self, request, pk, cycle_id):
        return Response(cycles.close(request.user, pk, cycle_id))


class LessonCycleLessonView(LessonCycleView):
    @extend_schema(request=LessonCycleLessonSerializer, responses=LessonCycleProjectionSerializer)
    def post(self, request, pk, cycle_id):
        self.readable_instance(request, pk)
        serializer = LessonCycleLessonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(cycles.add_lesson(request.user, pk, cycle_id, **serializer.validated_data))


class LessonCycleLessonDetailView(LessonCycleView):
    @extend_schema(request=None, responses=LessonCycleProjectionSerializer)
    def delete(self, request, pk, cycle_id, lesson_id):
        return Response(cycles.remove_lesson(request.user, pk, cycle_id, lesson_id))
