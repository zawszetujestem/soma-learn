from django.contrib import admin
from django.http import HttpResponseNotFound
from django.urls import include, path
from allauth.headless.constants import Client
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from users.views import RememberBrowserConfirmLoginCodeView, TrustedBrowserSessionView

HEADLESS_BLOCKED_PATHS = (
    'auth/reauthenticate',
    'account/password/change',
    'account/email',
    'account/phone',
    'auth/phone/verify',
    'auth/phone/verify/resend',
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    *[
        path(f'_allauth/browser/v1/{blocked}', lambda request: HttpResponseNotFound())
        for blocked in HEADLESS_BLOCKED_PATHS
    ],
    path(
        '_allauth/browser/v1/auth/code/confirm',
        RememberBrowserConfirmLoginCodeView.as_api_view(client=Client.BROWSER),
    ),
    path('_allauth/browser/v1/auth/session', TrustedBrowserSessionView.as_api_view(client=Client.BROWSER)),
    path('_allauth/', include('allauth.headless.urls')),
    path('api/auth/', include('users.urls')),
    path('api/', include('learning.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
