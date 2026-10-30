from django.conf import settings
from django.contrib import admin, messages
from django.utils.html import format_html
from rest_framework.exceptions import APIException

from . import version_services
from .content_services import etag
from .models import Course, CourseVersion, CourseScope, CourseSubject


class ReadOnlyContentAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Course)
class CourseAdmin(ReadOnlyContentAdmin):
    list_display = ('title', 'owner', 'visibility', 'is_active', 'current_published_version')
    list_filter = ('visibility', 'is_active')
    search_fields = ('title', 'owner__email')


@admin.register(CourseVersion)
class CourseVersionAdmin(ReadOnlyContentAdmin):
    list_display = ('course', 'number', 'title', 'state', 'preview_link')
    list_filter = ('state',)
    actions = ('accept_versions', 'reject_versions')

    def get_readonly_fields(self, request, obj=None):
        return super().get_readonly_fields(request, obj) + ('preview_link',)

    @admin.display(description='Podglad SPA')
    def preview_link(self, obj):
        return format_html(
            '<a href="{}/kursy/podglad/{}/wersje/{}">Podglad wersji</a>',
            settings.FRONTEND_BASE_URL.rstrip('/'), obj.course_id, obj.pk,
        )

    def get_actions(self, request):
        if not request.user.has_role('admin'):
            return {}
        return super().get_actions(request)

    def decide(self, request, queryset, operation):
        for version in queryset:
            try:
                version_services.transition(request.user, version.course_id, version.pk, etag(version), operation)
            except APIException as exc:
                self.message_user(request, str(exc.detail.get('detail', 'Blad decyzji.')), messages.ERROR)
            else:
                self.message_user(request, 'Zapisano decyzje.', messages.SUCCESS)

    @admin.action(description='Akceptuj zgloszone wersje')
    def accept_versions(self, request, queryset):
        self.decide(request, queryset, 'accept')

    @admin.action(description='Odrzuc zgloszone wersje')
    def reject_versions(self, request, queryset):
        self.decide(request, queryset, 'reject')


@admin.register(CourseScope, CourseSubject)
class ClassificationAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_editable = ('is_active',)
    list_filter = ('is_active',)
    search_fields = ('name',)
