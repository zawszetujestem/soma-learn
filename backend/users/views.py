from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Role, User
from .serializers import (
    EmailVerificationSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    SetPasswordSerializer,
    SocialLoginSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        self.send_verification_email(user)

    def send_verification_email(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verification_link = f'http://localhost:8000/api/auth/verify-email/?uid={uid}&token={token}'
        message = (
            f'Witaj {user.first_name},\n\n'
            f'Proszę potwierdź swój adres email, klikając poniższy link:\n{verification_link}\n\n'
            'Jeśli nie rejestrowałeś się w soma-learn, zignoruj tę wiadomość.'
        )
        send_mail(
            'Potwierdź swój adres email',
            message,
            'noreply@soma-learn.example.com',
            [user.email],
            fail_silently=False,
        )


class LoginView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data
        return Response({'token': token.key, 'user': user_data})


class SocialLoginView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = SocialLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data
        return Response({'token': token.key, 'user': user_data})


class VerifyEmailView(APIView):
    def get(self, request, *args, **kwargs):
        serializer = EmailVerificationSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Email został potwierdzony.'})


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
