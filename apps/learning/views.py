from typing import cast

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views import View

from apps.accounts.models import User

from .forms import AssignStudentForm, CourseForm
from .models import Course, CourseInstance, Invitation
from .services import (
    EmailMismatchError,
    InvitationNotUsableError,
    StudentRoleRequired,
    accept_invitation,
    assign_student,
    get_invitation_for_token,
    send_invitation_email,
)


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


class CourseInstanceCreateView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        course = get_object_or_404(Course, pk=pk, owner=user)
        return render(
            request,
            "learning/course_instance_form.html",
            {"course": course, "form": AssignStudentForm()},
        )

    def post(self, request: HttpRequest, pk: int) -> HttpResponse:
        user = cast(User, request.user)
        _require_mentor(user)
        course = get_object_or_404(Course, pk=pk, owner=user)
        form = AssignStudentForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data["email"]
            instance, invited, raw_token = assign_student(
                mentor=user, course=course, email=email
            )
            if invited and raw_token is not None:
                invitation_url = request.build_absolute_uri(
                    reverse("learning:invitation-accept", args=[raw_token])
                )
                send_invitation_email(email=email, invitation_url=invitation_url)
                messages.success(
                    request,
                    f"Wysłano zaproszenie na adres {email}.",
                )
            else:
                messages.success(request, f"Przypisano ucznia {email} do kursu.")
            return redirect("learning:course-list")
        return render(
            request,
            "learning/course_instance_form.html",
            {"course": course, "form": form},
        )


class InvitationAcceptView(LoginRequiredMixin, View):
    def get(self, request: HttpRequest, token: str) -> HttpResponse:
        invitation = get_invitation_for_token(token)
        context: dict[str, object] = {"token": token}
        if invitation is None or invitation.status != Invitation.Status.PENDING:
            context["error"] = "Zaproszenie jest nieważne lub zostało już wykorzystane."
        elif invitation.is_expired:
            context["error"] = "Zaproszenie wygasło."
        else:
            context["invitation"] = invitation
        return render(request, "learning/invitation_accept.html", context)

    def post(self, request: HttpRequest, token: str) -> HttpResponse:
        user = cast(User, request.user)
        invitation = get_invitation_for_token(token)
        if invitation is None:
            return render(
                request,
                "learning/invitation_accept.html",
                {"token": token, "error": "Zaproszenie jest nieważne."},
            )
        try:
            relationship = accept_invitation(raw_token=token, student=user)
        except StudentRoleRequired:
            return render(
                request,
                "learning/invitation_accept.html",
                {"token": token, "error": "Tylko uczniowie mogą akceptować zaproszenia."},
            )
        except EmailMismatchError:
            return render(
                request,
                "learning/invitation_accept.html",
                {"token": token, "error": "Zaproszenie dotyczy innego adresu e-mail."},
            )
        except InvitationNotUsableError:
            return render(
                request,
                "learning/invitation_accept.html",
                {"token": token, "error": "Zaproszenie jest nieważne lub wygasło."},
            )
        return redirect("learning:course-entry", pk=relationship.instance_id)
