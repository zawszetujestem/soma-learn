from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.views import View

from .models import CourseInstance


class CourseListView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest) -> HttpResponse:
        user = request.user
        instances = CourseInstance.objects.filter(
            Q(mentor=user) | Q(student=user)
        ).select_related("course", "mentor", "student").order_by("course__title", "pk")
        return render(request, "learning/course_list.html", {"instances": instances})


class CourseEntryView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = request.user
        instance = get_object_or_404(
            CourseInstance.objects.select_related("course", "mentor", "student"), pk=pk
        )
        if user.pk not in {instance.mentor_id, instance.student_id}:
            raise PermissionDenied("You do not have access to this course instance.")
        return render(request, "learning/course_entry.html", {"instance": instance})