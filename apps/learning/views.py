from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.views import View

from .models import Course


class MentorRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    request: HttpRequest

    def test_func(self) -> bool:
        user = self.request.user
        return bool(user.is_authenticated and getattr(user, "is_mentor", False))


class CourseListView(MentorRequiredMixin, View):
    def get(self, request: HttpRequest) -> HttpResponse:
        courses = Course.objects.order_by("title")
        return render(request, "learning/course_list.html", {"courses": courses})


class CourseEntryView(MentorRequiredMixin, View):
    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        course = get_object_or_404(Course, pk=pk)
        return render(request, "learning/course_entry.html", {"course": course})
