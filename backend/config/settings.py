import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'replace-this-secret-key')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
    'drf_spectacular',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.headless',
    'users',
    'learning',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

if os.getenv('USE_SQLITE', 'false').lower() in ('true', '1', 'yes'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif os.getenv('DATABASE_URL'):
    database_url = urlparse(os.environ['DATABASE_URL'])
    if database_url.scheme not in ('postgres', 'postgresql'):
        raise ValueError('DATABASE_URL must use the postgres or postgresql scheme.')

    database_options = {
        key: values[-1]
        for key, values in parse_qs(database_url.query).items()
        if key in ('sslmode', 'connect_timeout', 'application_name')
    }
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': unquote(database_url.path.lstrip('/')),
            'USER': unquote(database_url.username or ''),
            'PASSWORD': unquote(database_url.password or ''),
            'HOST': database_url.hostname or 'localhost',
            'PORT': str(database_url.port or 5432),
            **({'OPTIONS': database_options} if database_options else {}),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'soma_learn'),
            'USER': os.getenv('POSTGRES_USER', 'soma'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'soma123'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }
    }

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'django_cache',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]
SITE_ID = 1

ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = False
ACCOUNT_LOGIN_BY_CODE_ENABLED = False
ACCOUNT_LOGIN_BY_CODE_REQUIRED = {'password'}
ACCOUNT_LOGIN_BY_CODE_TIMEOUT = 600
ACCOUNT_LOGIN_BY_CODE_MAX_ATTEMPTS = 5
ACCOUNT_LOGIN_BY_CODE_SUPPORTS_RESEND = 1
ACCOUNT_LOGIN_BY_CODE_FORMAT = {'numeric': True, 'length': 6, 'dashed': False}
ALLAUTH_USER_CODE_FORMAT = {'numeric': True, 'length': 6, 'dashed': False}
ACCOUNT_PASSWORD_RESET_BY_CODE_ENABLED = True
PASSWORD_RESET_BY_CODE_TIMEOUT = 600
PASSWORD_RESET_BY_CODE_MAX_ATTEMPTS = 5
ACCOUNT_RATE_LIMITS = {
    'login': '30/15m/ip',
    'login_failed': '30/15m/ip,10/15m/key',
    'login_code_send': '20/h/ip,5/h/key',
    'login_code_resend': '1/60s/key',
    'reset_password': '20/h/ip,5/h/key',
    'reset_password_from_key': '20/h/ip',
    'signup': '20/h/ip',
    'confirm_email': '1/60s/key,20/h/ip',
}
HEADLESS_ONLY = True
HEADLESS_CLIENTS = ('browser',)
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173').rstrip('/')
HEADLESS_FRONTEND_URLS = {
    'account_confirm_email': f'{FRONTEND_BASE_URL}/potwierdzenie-email/{{key}}',
    'account_signup': f'{FRONTEND_BASE_URL}/rejestracja',
    'socialaccount_login_error': f'{FRONTEND_BASE_URL}/logowanie/google/callback',
}
ACCOUNT_CONFIRM_EMAIL_ON_GET = False
SOCIALACCOUNT_AUTO_SIGNUP = False
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
SOCIALACCOUNT_EMAIL_VERIFICATION = 'mandatory'
SOCIALACCOUNT_ADAPTER = 'users.adapters.SomaSocialAccountAdapter'
ACCOUNT_ADAPTER = 'users.adapters.SomaAccountAdapter'
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': os.getenv('GOOGLE_CLIENT_ID', ''),
            'secret': os.getenv('GOOGLE_CLIENT_SECRET', ''),
            'key': '',
        },
        'SCOPE': ['openid', 'profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'EMAIL_AUTHENTICATION': True,
    }
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', FRONTEND_BASE_URL).split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'SOMA Learn API',
    'DESCRIPTION': 'API dokumentacja dla platformy edukacyjnej SOMA Learn',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'ENUM_NAME_OVERRIDES': {
        'InstanceTaskStatusEnum': [
            ('todo', 'Do zrobienia'), ('in_progress', 'W trakcie'), ('done', 'Zrobione'),
        ],
        'InstanceStatusEnum': [('active', 'Aktywna'), ('closed', 'Zamknięta')],
    },
}

EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'
    if DEBUG
    else 'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@soma-learn.example.com')
