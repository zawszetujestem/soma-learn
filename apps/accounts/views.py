from django.conf import settings
from django.contrib.auth import login
from django.db import IntegrityError
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render

from .forms import RegistrationForm


def register(request: HttpRequest) -> HttpResponse:
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            try:
                user = form.save()
            except IntegrityError:
                form.add_error("email", "Konto z tym adresem e-mail już istnieje.")
            else:
                login(request, user)
                return redirect(settings.LOGIN_REDIRECT_URL)
    else:
        form = RegistrationForm()
    return render(request, "accounts/register.html", {"form": form})
