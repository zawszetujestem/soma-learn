"""Explicit author/student projections: private storage keys never enter JSON."""

from rest_framework import serializers


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = set(data) - set(self.fields)
            if unknown:
                raise serializers.ValidationError(
                    {key: 'Niedozwolone pole.' for key in unknown}
                )
        return super().to_internal_value(data)


class VersionPatchSerializer(StrictSerializer):
    title = serializers.CharField(max_length=200, allow_blank=True, required=False)
    description = serializers.CharField(allow_blank=True, required=False)
    scope_id = serializers.IntegerField(allow_null=True, required=False)
    subject_id = serializers.IntegerField(allow_null=True, required=False)


class NodeCreateSerializer(StrictSerializer):
    kind = serializers.ChoiceField(choices=['section', 'topic', 'lesson'])
    parent_id = serializers.IntegerField(allow_null=True, required=False)
    title = serializers.CharField(max_length=200)


class NodePatchSerializer(StrictSerializer):
    title = serializers.CharField(max_length=200, required=False)


class MoveSerializer(StrictSerializer):
    direction = serializers.ChoiceField(choices=['up', 'down'])


class ItemSerializer(StrictSerializer):
    category = serializers.ChoiceField(choices=['theory', 'practice'], required=False)
    format = serializers.ChoiceField(
        choices=['markdown', 'pdf', 'image', 'video', 'text', 'text_image'],
        required=False,
    )
    text = serializers.CharField(allow_blank=True, required=False)
    asset_id = serializers.UUIDField(allow_null=True, required=False)
    video_url = serializers.CharField(allow_blank=True, required=False, max_length=200)
    image_alt = serializers.CharField(allow_blank=True, required=False, max_length=255)
    answer_mode = serializers.ChoiceField(choices=['open', 'keyed'], required=False)
    answer_text = serializers.CharField(
        allow_blank=True, allow_null=True, required=False
    )


class StrictBoolean(serializers.BooleanField):
    def to_internal_value(self, data):
        if type(data) is not bool:
            self.fail('invalid', input=data)
        return data


class OptionInput(StrictSerializer):
    text = serializers.CharField(allow_blank=True, required=False, default='')
    is_correct = StrictBoolean(required=False, default=False)


class QuestionInput(StrictSerializer):
    type = serializers.ChoiceField(
        choices=['single', 'multiple'], required=False, default='single'
    )
    text = serializers.CharField(allow_blank=True, required=False, default='')
    options = OptionInput(many=True, required=False, default=list)


class TestInput(StrictSerializer):
    questions = QuestionInput(many=True)


def classification(obj):
    return (
        None
        if obj is None
        else {'id': obj.pk, 'name': obj.name, 'is_active': obj.is_active}
    )


def asset_data(asset):
    return {
        'id': str(asset.pk),
        'original_name': asset.original_name,
        'media_type': asset.media_type,
        'size_bytes': asset.size_bytes,
    }


def item_data(item, *, keys=True):
    data = {
        field: getattr(item, field)
        for field in (
            'id',
            'category',
            'format',
            'position',
            'text',
            'video_url',
            'image_alt',
        )
    }
    data['asset'] = asset_data(item.asset) if item.asset_id else None
    if item.category == 'practice':
        data['answer_mode'] = item.answer_mode
        if keys:
            data['answer_text'] = item.answer_text
    return data


def test_data(test, *, keys=True):
    if test is None:
        return None
    questions = []
    for question in test.questions.all():
        options = []
        for option in question.options.all():
            data = {'id': option.pk, 'position': option.position, 'text': option.text}
            if keys:
                data['is_correct'] = option.is_correct
            options.append(data)
        questions.append(
            {
                'id': question.pk,
                'position': question.position,
                'type': question.type,
                'text': question.text,
                'options': options,
            }
        )
    return {'id': test.pk, 'questions': questions}


def prerequisite_data(prerequisite):
    if prerequisite is None:
        return None
    return {
        'source_id': prerequisite.source_id,
        'threshold': prerequisite.threshold,
        'message': f'Wymaga zaliczenia „{prerequisite.source.title}” na {prerequisite.threshold}%.',
    }


def node_data(node, *, keys=True, children=None):
    data = {
        field: getattr(node, field)
        for field in ('id', 'kind', 'title', 'position', 'parent_id')
    }
    data['children'] = (
        children
        if children is not None
        else [node_data(n, keys=keys) for n in node.children.all()]
    )
    data['prerequisite'] = prerequisite_data(getattr(node, 'prerequisite', None))
    data['test'] = test_data(getattr(node, 'test', None), keys=keys)
    if node.kind == 'lesson':
        items = list(node.items.all())
        for category in ('theory', 'practice'):
            data[category] = [
                item_data(item, keys=keys)
                for item in items
                if item.category == category
            ]
    return data


def version_summary(version):
    data = {
        field: getattr(version, field)
        for field in (
            'id',
            'number',
            'state',
            'revision',
            'title',
            'description',
            'rejection_reason',
        )
    }
    data.update(
        course=version.course_id,
        course_owner=version.course.owner_id,
        course_visibility=version.course.visibility,
        course_is_active=version.course.is_active,
        reviewed_by=version.reviewed_by_id,
        scope=classification(version.scope),
        subject=classification(version.subject),
    )
    for field in (
        'created_at',
        'updated_at',
        'submitted_at',
        'published_at',
        'reviewed_at',
    ):
        value = getattr(version, field)
        data[field] = value.isoformat() if value else None
    return data


def version_full(version, *, keys=True):
    # Flat prefetch avoids N+1 queries even for wide/deep trees.
    nodes = list(
        version.nodes.select_related('test', 'prerequisite__source').prefetch_related(
            'items__asset', 'test__questions__options'
        )
    )
    by_parent = {}
    for node in nodes:
        by_parent.setdefault(node.parent_id, []).append(node)

    def tree(parent):
        return [
            node_data(n, keys=keys, children=tree(n.pk))
            for n in by_parent.get(parent, [])
        ]

    return dict(version_summary(version), nodes=tree(None))
