from typing import cast

from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, transaction
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from apps.learning.services import end_relationships_for_user

from .forms import RegistrationForm
from .models import User


def register(request: HttpRequest) -> HttpResponse:
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            try:
                with transaction.atomic():
                    user = form.save()
            except IntegrityError:
                email = form.cleaned_data.get("email", "")
                if not User.objects.filter(email__iexact=email).exists():
                    raise
                form.add_error("email", "Konto z tym adresem e-mail już istnieje.")
            else:
                login(request, user)
                return redirect(settings.LOGIN_REDIRECT_URL)
    else:
        form = RegistrationForm()
    return render(request, "accounts/register.html", {"form": form})


@login_required
@require_POST
def delete_account(request: HttpRequest) -> HttpResponse:
    user = cast(User, request.user)
    end_relationships_for_user(user=user)
    user.soft_delete()
    logout(request)
    return redirect(settings.LOGOUT_REDIRECT_URL)
