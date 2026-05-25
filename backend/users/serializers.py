from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from .models import Role, User


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')

    class Meta:
        model = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'age',
            'specialization',
            'contact',
            'bio',
            'rating',
            'social_provider',
            'is_email_confirmed',
            'roles',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[Role.STUDENT, Role.MENTOR])

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'email',
            'password',
            'role',
            'age',
            'specialization',
            'contact',
            'bio',
        ]

    def validate(self, data):
        role = data.get('role')
        if role == Role.MENTOR and not data.get('specialization'):
            raise serializers.ValidationError({'specialization': 'Mentors must provide a specialization.'})
        return data

    def create(self, validated_data):
        role_name = validated_data.pop('role')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        role_obj, _ = Role.objects.get_or_create(name=role_name)
        user.roles.add(role_obj)
        if role_name == Role.ADMIN:
            user.is_staff = True
            user.save(update_fields=['is_staff'])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password.', code='authorization')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.', code='authorization')
            data['user'] = user
            return data
        raise serializers.ValidationError('Must include email and password.')


class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=['google', 'facebook', 'icloud'])
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    def validate(self, data):
        if data['provider'] not in ['google', 'facebook', 'icloud']:
            raise serializers.ValidationError('Unsupported social provider.')
        return data

    def create(self, validated_data):
        user, created = User.objects.get_or_create(
            email=validated_data['email'],
            defaults={
                'first_name': validated_data['first_name'],
                'last_name': validated_data['last_name'],
                'social_provider': validated_data['provider'],
                'is_email_confirmed': True,
            },
        )
        if created:
            student_role, _ = Role.objects.get_or_create(name=Role.STUDENT)
            user.roles.add(student_role)
            user.set_unusable_password()
            user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError('Invalid reset link.')

        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError('Invalid or expired token.')

        data['user'] = user
        return data

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class EmailVerificationSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError('Invalid verification link.')

        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError('Invalid or expired token.')

        data['user'] = user
        return data

    def save(self):
        user = self.validated_data['user']
        user.is_email_confirmed = True
        user.save(update_fields=['is_email_confirmed'])
        return user
