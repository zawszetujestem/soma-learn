from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ['email', 'first_name', 'last_name', 'is_staff', 'is_active', 'is_email_confirmed']
    list_filter = ['is_staff', 'is_active', 'roles']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'age', 'specialization', 'contact', 'bio', 'rating')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'roles', 'is_email_confirmed')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'roles', 'is_active', 'is_staff'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
