from typing import cast

from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views import View

from apps.accounts.models import User

from .forms import CourseForm
from .models import Course, CourseInstance


def _require_mentor(user: User) -> None:
    if not user.is_mentor:
        raise PermissionDenied("Tylko mentorzy mogą zarządzać kursami.")


class CourseListView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest) -> HttpResponse:
        user = cast(User, request.user)
        instances = CourseInstance.objects.filter(
            Q(mentor=user) | Q(student=user)
        ).select_related("course", "mentor", "student").order_by("course__title", "pk")
        owned_courses = (
            Course.objects.filter(owner=user).order_by("title")
            if user.is_mentor
            else Course.objects.none()
        )
        return render(
            request,
            "learning/course_list.html",
            {"instances": instances, "owned_courses": owned_courses},
        )


class CourseEntryView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        instance = get_object_or_404(
            CourseInstance.objects.select_related("course", "mentor", "student"), pk=pk
        )
        if user.pk not in {instance.mentor_id, instance.student_id}:
            raise PermissionDenied("You do not have access to this course instance.")
        return render(request, "learning/course_entry.html", {"instance": instance})


class CourseCreateView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest) -> HttpResponse:
        _require_mentor(cast(User, request.user))
        return render(request, "learning/course_form.html", {"form": CourseForm()})

    def post(self, request: HttpRequest) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        form = CourseForm(request.POST)
        if form.is_valid():
            course = form.save(commit=False)
            course.owner = user
            course.save()
            return redirect("learning:course-list")
        return render(request, "learning/course_form.html", {"form": form})


class CourseUpdateView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        course = get_object_or_404(Course, pk=pk, owner=user)
        return render(
            request,
            "learning/course_form.html",
            {"form": CourseForm(instance=course), "course": course},
        )

    def post(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        course = get_object_or_404(Course, pk=pk, owner=user)
        form = CourseForm(request.POST, instance=course)
        if form.is_valid():
            form.save()
            return redirect("learning:course-list")
        return render(
            request,
            "learning/course_form.html",
            {"form": form, "course": course},
        )


class CourseDeleteView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        course = get_object_or_404(Course, pk=pk, owner=user)
        return render(request, "learning/course_confirm_delete.html", {"course": course})

    def post(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        course = get_object_or_404(Course, pk=pk, owner=user)
        course.delete()
        return redirect("learning:course-list")
