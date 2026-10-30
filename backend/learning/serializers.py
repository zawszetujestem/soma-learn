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


class CourseCreateSerializer(serializers.Serializer):
    visibility = serializers.ChoiceField(choices=Course.Visibility.choices)
    title = serializers.CharField(max_length=200, allow_blank=True, required=False, default='')
    description = serializers.CharField(allow_blank=True, required=False, default='')
    scope_id = serializers.IntegerField(allow_null=True, required=False)
    subject_id = serializers.IntegerField(allow_null=True, required=False)

    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key:'Niedozwolone pole.' for key in unknown})
        return super().to_internal_value(data)


class CourseIdentitySerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)

    def to_internal_value(self, data):
        from .validators import invalid
        if 'visibility' in data:
            raise invalid('visibility_immutable', 'Widoczność kursu nie może zostać zmieniona.')
        if {'title','description','scope_id','subject_id'} & set(data):
            raise invalid('version_fields_required', 'Treść kursu zmieniaj przez wersję.')
        if set(data) - {'is_active'}:
            raise serializers.ValidationError('Dozwolone jest wyłącznie pole is_active.')
        return super().to_internal_value(data)


class CourseSerializer(serializers.ModelSerializer):
    tasks = CourseTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id','owner','visibility','is_active','tasks','created_at','updated_at','current_published_version']
        read_only_fields = fields

    def to_representation(self, instance):
        from .content_serializers import classification
        data = super().to_representation(instance)
        version = instance.current_published_version
        data.update(title=version.title if version else '', description=version.description if version else '',
            scope=classification(version.scope) if version else None,
            subject=classification(version.subject) if version else None, program=[])
        if version:
            # Program deliberately does not fetch material/test/asset relations.
            nodes = list(version.nodes.all())
            def tree(parent):
                return [dict(id=n.pk, kind=n.kind, title=n.title, position=n.position,
                    children=tree(n.pk)) for n in nodes if n.parent_id == parent]
            data['program'] = tree(None)
        return data


class ManageCourseSerializer(CourseSerializer):
    def to_representation(self, instance):
        from .content_serializers import version_summary
        data = super().to_representation(instance)
        versions = [version_summary(v) for v in instance.versions.select_related('course','scope','subject')]
        working = next((v for v in versions if v['state'] != 'published'), None)
        # Manage metadata reflects the editable version, never used for public detail.
        chosen = working or next((v for v in versions if v['id']==instance.current_published_version_id), None)
        if chosen:
            data.update({field:chosen[field] for field in ('title','description','scope','subject')})
        data.update(working_version=working, versions=versions, invite_token=instance.invite_token,
            approval_status=instance.approval_status)
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
            'id', 'course', 'course_version', 'student', 'mentor', 'status', 'closed_at', 'created_at', 'progress', 'tasks',
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_progress(self, obj):
        return float(calculate_progress(obj.tasks.all()))


class InstanceTaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=InstanceTask.Status.choices)


class StudentsCountSerializer(serializers.Serializer):
    count = serializers.IntegerField(read_only=True)
