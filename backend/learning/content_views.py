"""Version authoring, lifecycle and instance content projections."""

from django.http import FileResponse
from rest_framework import serializers
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import asset_services, version_services
from . import content_serializers as output
from . import content_services as service
from .file_validation import validate_file
from .models import CourseScope, CourseVersion, Instance, NodePrerequisite
from .services import forbidden, not_found
from .validators import invalid, validate_version_for_publication
from .views import AUTHENTICATION_CLASSES


class ContentView(APIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = (IsAuthenticated,)

    def version_response(self, version, data, status=200):
        response = Response(data, status=status)
        response['ETag'] = service.etag(version)
        return response


class DictionaryView(ContentView):
    model = CourseScope

    def get(self, request):
        return Response(
            [
                output.classification(obj)
                for obj in self.model.objects.filter(is_active=True)
            ]
        )


class VersionListView(ContentView):
    def get(self, request, course_id):
        course = service.get_course(request.user, course_id)
        return Response(
            [
                output.version_summary(v)
                for v in course.versions.select_related('course', 'scope', 'subject')
            ]
        )

    def post(self, request, course_id):
        service.parse(output.StrictSerializer, request.data)
        version = version_services.copy_publication(request.user, course_id)
        return self.version_response(version, output.version_full(version), 201)


class VersionTransitionView(ContentView):
    operation = ''

    def post(self, request, course_id, version_id):
        serializer = RejectSerializer if self.operation == 'reject' else output.StrictSerializer
        values = service.parse(serializer, request.data)
        version = version_services.transition(request.user, course_id, version_id,
            request.headers.get('If-Match'), self.operation, **values)
        return self.version_response(version, output.version_summary(version))


class RejectSerializer(output.StrictSerializer):
    reason = serializers.CharField(allow_blank=True, required=False, default='')


class ModerationView(ContentView):
    def get(self, request):
        if not request.user.has_role('admin'):
            raise forbidden('Moderacja wymaga roli administratora.')
        versions = CourseVersion.objects.filter(state='submitted').select_related('course','scope','subject')
        return Response([output.version_summary(v) for v in versions])


class InstanceContentView(ContentView):
    def get(self, request, pk):
        instance = Instance.objects.select_related('course','course_version__scope','course_version__subject').filter(pk=pk).first()
        if instance is None:
            raise not_found()
        keys = service.can_manage(request.user, instance.course)
        if not keys and request.user.pk not in (instance.student_id, instance.mentor_id):
            raise not_found()
        version = instance.course_version
        return self.version_response(version, output.version_full(version, keys=keys))


class VersionView(ContentView):
    def get(self, request, course_id, version_id):
        version = service.get_version(request.user, course_id, version_id)
        return self.version_response(version, output.version_full(version))

    def patch(self, request, course_id, version_id):
        with service.edit_version(
            request.user, course_id, version_id, request.headers.get('If-Match')
        ) as version:
            service.update_metadata(version, request.data)
            service.bump_revision(version)
            data = output.version_summary(version)
        return self.version_response(version, data)


class VersionProjectionView(ContentView):
    projection = 'preview'

    def get(self, request, course_id, version_id):
        version = service.get_version(request.user, course_id, version_id)
        data = (
            validate_version_for_publication(version)
            if self.projection == 'validation'
            else output.version_full(version, keys=False)
        )
        return self.version_response(version, data)


class VersionMutationView(ContentView):
    operation = ''

    # Deliberately explicit method support per resource (configured subclasses).
    def execute(
        self, request, course_id, version_id, node_id=None, lesson_id=None, item_id=None
    ):
        with service.edit_version(
            request.user, course_id, version_id, request.headers.get('If-Match')
        ) as version:
            method = request.method
            data, status, changed = None, 200, True
            op = self.operation
            node = service.get_node(version, node_id) if node_id else None
            if op == 'nodes':
                saved = service.create_node(version, request.data)
                data, status = output.node_data(saved), 201
            elif op == 'node':
                if method == 'DELETE':
                    service.delete_node(version, node)
                    status = 204
                else:
                    data = output.node_data(service.patch_node(node, request.data))
            elif op == 'node_move':
                direction = service.parse(output.MoveSerializer, request.data)[
                    'direction'
                ]
                data = service.move(
                    version.nodes.filter(parent_id=node.parent_id),
                    node,
                    direction,
                    version=version,
                )
                changed = data['moved']
            elif op == 'prerequisite':
                if method == 'DELETE':
                    NodePrerequisite.objects.filter(target=node).delete()
                    status = 204
                else:
                    data = output.prerequisite_data(
                        service.put_prerequisite(version, node, request.data)
                    )
            elif op == 'test':
                if method == 'DELETE':
                    service.delete_test(node)
                    status = 204
                else:
                    saved = service.replace_test(
                        node, request.data, create=method == 'POST'
                    )
                    data, status = (
                        output.test_data(saved),
                        201 if method == 'POST' else 200,
                    )
            elif op in ('items', 'item', 'item_move'):
                lesson = service.get_node(version, lesson_id, lesson=True)
                item = lesson.items.filter(pk=item_id).first() if item_id else None
                if item_id and item is None:
                    raise not_found()
                if op == 'item_move':
                    direction = service.parse(output.MoveSerializer, request.data)[
                        'direction'
                    ]
                    data = service.move(
                        lesson.items.filter(category=item.category), item, direction
                    )
                    changed = data['moved']
                elif method == 'DELETE':
                    item.delete()
                    status = 204
                else:
                    saved = service.save_item(version, lesson, request.data, item)
                    data, status = (
                        output.item_data(saved),
                        201 if op == 'items' else 200,
                    )
            if changed:
                service.bump_revision(version)
        return self.version_response(version, data, status)


class NodeCreateView(VersionMutationView):
    operation = 'nodes'
    post = VersionMutationView.execute


class NodeDetailView(VersionMutationView):
    operation = 'node'
    patch = delete = VersionMutationView.execute


class NodeMoveView(VersionMutationView):
    operation = 'node_move'
    post = VersionMutationView.execute


class PrerequisiteView(VersionMutationView):
    operation = 'prerequisite'
    put = delete = VersionMutationView.execute


class NodeTestView(VersionMutationView):
    operation = 'test'
    post = put = delete = VersionMutationView.execute


class ItemCreateView(VersionMutationView):
    operation = 'items'
    post = VersionMutationView.execute


class ItemDetailView(VersionMutationView):
    operation = 'item'
    patch = delete = VersionMutationView.execute


class ItemMoveView(VersionMutationView):
    operation = 'item_move'
    post = VersionMutationView.execute


class AssetUploadView(ContentView):
    parser_classes = (MultiPartParser,)

    def post(self, request, course_id, version_id):
        # Check access before parsing/validating potentially hostile bytes.
        service.get_version(request.user, course_id, version_id)
        saved = None
        try:
            with service.edit_version(
                request.user, course_id, version_id, request.headers.get('If-Match')
            ) as version:
                if (
                    set(request.data) != {'file'}
                    or len(request.FILES.getlist('file')) != 1
                ):
                    raise invalid('invalid_file', 'Prześlij jeden plik w polu file.')
                upload = request.FILES['file']
                validated = validate_file(upload)
                saved = asset_services.upload_asset(
                    version, request.user, upload, validated
                )
                service.bump_revision(version)
                data = output.asset_data(saved)
        except Exception:
            if saved is not None:
                saved.file.storage.delete(saved.file.name)
            raise
        return self.version_response(version, data, 201)


class AssetListView(ContentView):
    def get(self, request, course_id):
        course = service.get_course(request.user, course_id)
        return Response(asset_services.list_assets(course))


class AssetDeleteView(ContentView):
    def delete(self, request, course_id, asset_id):
        asset_services.delete_asset(request.user, course_id, asset_id)
        return Response(status=204)


class AssetDownloadView(ContentView):
    def get(self, request, course_id, version_id, asset_id):
        asset = asset_services.downloadable_asset(
            request.user, course_id, version_id, asset_id
        )
        try:
            file = asset.file.open('rb')
        except FileNotFoundError:
            raise not_found()
        response = FileResponse(
            file,
            content_type=asset.media_type,
            as_attachment=asset.media_type == 'application/pdf',
            filename=asset.original_name,
        )
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'private, no-store'
        return response
