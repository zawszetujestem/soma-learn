from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Course, CourseTask, Instance, InstanceTask
from .progress import calculate_progress


class CourseTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseTask
        fields = ['id', 'title', 'hours', 'position']
        read_only_fields = ['id']

    def validate_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError('Liczba godzin musi być dodatnia.')
        return value


class CourseSerializer(serializers.ModelSerializer):
    tasks = CourseTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'owner', 'title', 'description', 'visibility', 'approval_status',
            'is_active', 'tasks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'approval_status', 'created_at', 'updated_at']

    def validate(self, attrs):
        if self.instance is not None and 'visibility' in attrs and attrs['visibility'] != self.instance.visibility:
            raise serializers.ValidationError({'visibility': 'Widoczność kursu nie może zostać zmieniona.'})
        return attrs


class ManageCourseSerializer(CourseSerializer):
    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['invite_token']
        read_only_fields = CourseSerializer.Meta.read_only_fields + ['invite_token']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('invite_token') is None:
            data.pop('invite_token', None)
        return data


class InstanceTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstanceTask
        fields = ['id', 'title', 'hours', 'status', 'position']
        read_only_fields = ['id', 'title', 'hours', 'position']


class InstanceSerializer(serializers.ModelSerializer):
    tasks = InstanceTaskSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Instance
        fields = [
            'id', 'course', 'student', 'mentor', 'status', 'closed_at', 'created_at', 'progress', 'tasks',
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_progress(self, obj):
        return float(calculate_progress(obj.tasks.all()))


class InstanceTaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=InstanceTask.Status.choices)


class StudentsCountSerializer(serializers.Serializer):
    count = serializers.IntegerField(read_only=True)
