from django import forms
from django.contrib import admin

from .models import Course


class CourseAdminForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = '__all__'

    def clean_approval_status(self):
        new_status = self.cleaned_data['approval_status']
        old_status = self.instance._loaded_status
        if old_status is not None and not Course.is_status_transition_allowed(old_status, new_status):
            raise forms.ValidationError('Niedozwolona zmiana statusu zatwierdzenia.')
        return new_status


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    form = CourseAdminForm
    list_display = ('title', 'owner', 'visibility', 'approval_status', 'is_active')
    list_filter = ('visibility', 'approval_status', 'is_active')
    search_fields = ('title', 'owner__email')

    def get_readonly_fields(self, request, obj=None):
        if obj is None:
            return ('invite_token', 'created_at', 'updated_at')
        return ('visibility', 'invite_token', 'created_at', 'updated_at')
