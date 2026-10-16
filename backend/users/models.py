from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class Role(models.Model):
    STUDENT = 'student'
    MENTOR = 'mentor'
    OWNER = 'owner'
    ADMIN = 'admin'

    ROLE_CHOICES = [
        (STUDENT, 'Student'),
        (MENTOR, 'Mentor'),
        (OWNER, 'Owner'),
        (ADMIN, 'Admin'),
    ]

    name = models.CharField(max_length=20, choices=ROLE_CHOICES, unique=True)

    def __str__(self):
        return self.get_name_display()


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        user = self.create_user(email, password, **extra_fields)
        admin_role, _ = Role.objects.get_or_create(name=Role.ADMIN)
        user.roles.add(admin_role)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    specialization = models.CharField(max_length=255, blank=True)
    contact = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    social_provider = models.CharField(max_length=32, blank=True)
    is_email_confirmed = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    roles = models.ManyToManyField(Role, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        ordering = ['email']

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def get_short_name(self):
        return self.first_name

    def has_role(self, role_name):
        return self.roles.filter(name=role_name).exists()

    @property
    def is_student(self):
        return self.has_role(Role.STUDENT)

    @property
    def is_mentor(self):
        return self.has_role(Role.MENTOR)

    @property
    def is_owner(self):
        return self.has_role(Role.OWNER)

    @property
    def is_admin(self):
        return self.has_role(Role.ADMIN)
