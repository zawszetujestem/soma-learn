from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Course, CourseTask, Instance, InstanceTask
from .progress import calculate_progress


class CourseTaskSerializer(serializers.ModelSerializer):
    prerequisite_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False,
                                             write_only=True)

    class Meta:
        model = CourseTask
        fields = ['id', 'title', 'hours', 'position', 'prerequisite_ids']
        read_only_fields = ['id']

    def validate_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError('Liczba godzin musi być dodatnia.')
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['prerequisite_ids'] = sorted(p.pk for p in instance.prerequisites.all())
        return data

    def create(self, validated_data):
        from .services import validate_task_prerequisites
        ids = validated_data.pop('prerequisite_ids', [])
        validate_task_prerequisites(validated_data['course'].pk, None, ids)
        task = super().create(validated_data)
        task.prerequisites.set(ids)
        return task

    def update(self, instance, validated_data):
        from .services import validate_task_prerequisites
        ids = validated_data.pop('prerequisite_ids', None)
        if ids is not None:
            validate_task_prerequisites(instance.course_id, instance.pk, ids)
        task = super().update(instance, validated_data)
        if ids is not None:
            task.prerequisites.set(ids)
        return task


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


class CycleEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    task_id = serializers.IntegerField()
    title = serializers.CharField()
    status = serializers.ChoiceField(choices=InstanceTask.Status.choices)
    removed_at = serializers.DateTimeField(allow_null=True)


class CycleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    started_at = serializers.DateTimeField()
    ended_at = serializers.DateTimeField(allow_null=True)
    tasks = CycleEntrySerializer(many=True)


class InstanceTaskSerializer(serializers.ModelSerializer):
    prerequisite_ids = serializers.SerializerMethodField()
    blocked = serializers.SerializerMethodField()
    selected = serializers.SerializerMethodField()

    class Meta:
        model = InstanceTask
        fields = ['id', 'title', 'hours', 'status', 'position', 'prerequisite_ids', 'blocked', 'selected']
        read_only_fields = ['id', 'title', 'hours', 'position']

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_prerequisite_ids(self, obj):
        return sorted(p.pk for p in obj.prerequisites.all())

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_blocked(self, obj):
        from .services import task_blocked
        return task_blocked(obj)

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_selected(self, obj):
        return obj.cycle_entries.filter(cycle__ended_at__isnull=True, removed_at__isnull=True).exists()


class InstanceSerializer(serializers.ModelSerializer):
    tasks = InstanceTaskSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course_version.title', read_only=True)
    active_cycle = serializers.SerializerMethodField()
    cycle_history = serializers.SerializerMethodField()

    class Meta:
        model = Instance
        fields = [
            'id', 'course', 'course_version', 'student', 'mentor', 'status', 'closed_at', 'created_at', 'progress', 'tasks',
            'course_title', 'active_cycle', 'cycle_history',
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_progress(self, obj):
        return float(calculate_progress(obj.tasks.all()))

    @staticmethod
    def cycle_data(cycle):
        return {
            'id': cycle.pk, 'started_at': cycle.started_at, 'ended_at': cycle.ended_at,
            'tasks': [
                {'id': e.pk, 'task_id': e.task_id, 'title': e.task.title,
                 'status': e.status, 'removed_at': e.removed_at}
                for e in cycle.entries.select_related('task').all()
            ],
        }

    @extend_schema_field(CycleSerializer(allow_null=True))
    def get_active_cycle(self, obj):
        cycle = obj.cycles.filter(ended_at__isnull=True).first()
        return self.cycle_data(cycle) if cycle else None

    @extend_schema_field(CycleSerializer(many=True))
    def get_cycle_history(self, obj):
        return [self.cycle_data(cycle) for cycle in obj.cycles.filter(ended_at__isnull=False)]


class InstanceTaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=InstanceTask.Status.choices, required=False)
    selected = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Podaj status lub wybór zadania do cyklu.')
        return attrs


class StudentsCountSerializer(serializers.Serializer):
    count = serializers.IntegerField(read_only=True)
