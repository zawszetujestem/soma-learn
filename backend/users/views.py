from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.http import HttpResponseRedirect
from urllib.parse import urlencode
from allauth.account.internal.flows.login import get_authentication_records
from allauth.account.models import EmailAddress
from allauth.core import ratelimit
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import (
    EmailVerificationSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    SetPasswordSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    @extend_schema(responses={201: UserSerializer})
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        data = dict(UserSerializer(serializer.instance).data)
        data.pop('age', None)
        return Response(data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        user = serializer.save()
        self.send_verification_email(user)

    def send_verification_email(self, user):
        address = EmailAddress.objects.create(user=user, email=user.email, primary=True, verified=False)
        address.send_confirmation(self.request, signup=True)


class LoginView(APIView):
    @extend_schema(request=None, responses={410: OpenApiTypes.OBJECT})
    def post(self, request, *args, **kwargs):
        return Response({'detail': 'Use the allauth browser login flow.'}, status=status.HTTP_410_GONE)


class TokenExchangeView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: inline_serializer(
            name='TokenExchangeResponse',
            fields={'token': serializers.CharField(), 'user': UserSerializer()},
        )},
    )
    def post(self, request, *args, **kwargs):
        if not request.user.is_email_confirmed or not get_authentication_records(request, request.user):
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_403_FORBIDDEN)
        token, _ = Token.objects.get_or_create(user=request.user)
        return Response({'token': token.key, 'user': UserSerializer(request.user).data})


class SocialLoginView(APIView):
    @extend_schema(request=None, responses={410: OpenApiTypes.OBJECT})
    def post(self, request, *args, **kwargs):
        return Response({'detail': 'Use the allauth Google login flow.'}, status=status.HTTP_410_GONE)


class VerifyEmailView(APIView):
    @extend_schema(responses={302: None})
    def get(self, request, *args, **kwargs):
        query = urlencode({key: request.query_params.get(key, '') for key in ('uid', 'token')})
        return HttpResponseRedirect(f'{settings.FRONTEND_BASE_URL}/potwierdzenie-email/?{query}')

    @extend_schema(request=EmailVerificationSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request, *args, **kwargs):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Email został potwierdzony.'})


class ResendEmailVerificationView(APIView):
    @extend_schema(request=PasswordResetRequestSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        allowed = ratelimit.consume(
            request, action='confirm_email', key=email,
        )
        if allowed:
            user = User.objects.filter(email__iexact=email, is_email_confirmed=False, is_active=True).first()
            if user:
                address, _ = EmailAddress.objects.get_or_create(
                    user=user, email=user.email, defaults={'primary': True, 'verified': False},
                )
                if not address.verified:
                    address.send_confirmation(request)
        return Response({'detail': 'If verification is needed, instructions have been sent.'})


class PasswordResetRequestView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Jeśli konto istnieje, instrukcje zostały wysłane.'}, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f'http://localhost:8000/api/auth/password-reset-confirm/?uid={uid}&token={token}'
        message = (
            f'Witaj {user.first_name},\n\n'
            'Otrzymaliśmy prośbę o zresetowanie hasła. Kliknij poniższy link, aby ustawić nowe hasło:\n'
            f'{reset_link}\n\n'
            'Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.'
        )
        send_mail(
            'Resetowanie hasła soma-learn',
            message,
            'noreply@soma-learn.example.com',
            [user.email],
            fail_silently=False,
        )
        return Response({'detail': 'Jeśli konto istnieje, instrukcje zostały wysłane.'}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Hasło zostało zmienione.'})


class CurrentUserView(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)
        data = UserSerializer(request.user).data
        return Response(data)
