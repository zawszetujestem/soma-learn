from datetime import timedelta
import re

from rest_framework import serializers

from .models import InstanceLessonCycle


class LocalDateField(serializers.DateField):
    def to_internal_value(self, value):
        if not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', value):
            self.fail('invalid', format='YYYY-MM-DD')
        return super().to_internal_value(value)


def validate_date_range(start_date, end_date):
    if end_date <= start_date:
        raise serializers.ValidationError({'end_date': 'Koniec musi być późniejszy niż początek.'})


class LessonCycleCreateSerializer(serializers.Serializer):
    start_date = LocalDateField(input_formats=['%Y-%m-%d'])
    end_date = LocalDateField(input_formats=['%Y-%m-%d'], required=False)

    def validate(self, data):
        if 'end_date' not in data:
            try:
                data['end_date'] = data['start_date'] + timedelta(days=7)
            except OverflowError:
                raise serializers.ValidationError({'end_date': 'Podaj poprawną datę końca.'})
        validate_date_range(data['start_date'], data['end_date'])
        return data


class LessonCycleUpdateSerializer(serializers.Serializer):
    start_date = LocalDateField(input_formats=['%Y-%m-%d'], required=False)
    end_date = LocalDateField(input_formats=['%Y-%m-%d'], required=False)


class LessonCycleLessonSerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField(min_value=1)


class LessonCycleSerializer(serializers.ModelSerializer):
    last_day = serializers.SerializerMethodField()
    lesson_ids = serializers.SerializerMethodField()

    class Meta:
        model = InstanceLessonCycle
        fields = ['id', 'status', 'start_date', 'end_date', 'last_day', 'lesson_ids']

    def get_last_day(self, cycle) -> str:
        return (cycle.end_date - timedelta(days=1)).isoformat()

    def get_lesson_ids(self, cycle) -> list[int]:
        return [entry.lesson_id for entry in cycle.entries.all()]


class LessonCycleProjectionSerializer(serializers.Serializer):
    active_cycle = LessonCycleSerializer(allow_null=True)
    planned_cycle = LessonCycleSerializer(allow_null=True)
    history = LessonCycleSerializer(many=True)
