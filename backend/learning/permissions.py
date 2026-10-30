from rest_framework.permissions import BasePermission


class IsCourseManager(BasePermission):
    message = 'Tylko mentor lub administrator może zarządzać kursami.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.has_role('mentor') or user.has_role('admin')))
