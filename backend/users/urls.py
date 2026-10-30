from django.urls import path
from allauth.headless.account.views import ResendLoginCodeView
from allauth.headless.constants import Client
from .views import (
    CurrentUserView,
    LoginView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendEmailVerificationView,
    SocialLoginView,
    TokenExchangeView,
    VerifyEmailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/resend/', ResendLoginCodeView.as_api_view(client=Client.BROWSER), name='resend-login-code'),
    path('token/exchange/', TokenExchangeView.as_view(), name='token-exchange'),
    path('social-login/', SocialLoginView.as_view(), name='social-login'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('verify-email/resend/', ResendEmailVerificationView.as_view(), name='resend-email-verification'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
]
