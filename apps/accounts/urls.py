from django.contrib.auth import views as auth_views
from django.urls import path

from . import api, views
from .forms import MentorLoginForm

app_name = "accounts"

urlpatterns = [
    path(
        "login/",
        auth_views.LoginView.as_view(
            template_name="accounts/login.html", authentication_form=MentorLoginForm
        ),
        name="login",
    ),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("register/", views.register, name="register"),
    path("delete/confirm/", views.delete_account_confirm, name="delete-account-confirm"),
    path("delete/", views.delete_account, name="delete-account"),
    path("api/csrf/", api.csrf, name="api-csrf"),
    path("api/login/", api.login_view, name="api-login"),
    path("api/register/", api.register_view, name="api-register"),
    path("api/logout/", api.logout_view, name="api-logout"),
    path("api/me/", api.me, name="api-me"),
]
