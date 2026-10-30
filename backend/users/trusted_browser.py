"""Optional 24h trust for a browser profile after a correct login code (OTP).

Only the SHA-256 hash of the random token is stored; the raw token lives only in
an HttpOnly cookie. Trust is bound to the user's current password hash through
an HMAC fingerprint, so any password change/reset invalidates every profile.
"""
import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from .models import TrustedBrowser

COOKIE_NAME = 'soma_trusted_browser'
TRUST_AGE = timedelta(hours=24)
MAX_COOKIE_LENGTH = 128
FINGERPRINT_SALT = 'users.trusted_browser.password_fingerprint'


def _hash_token(raw):
    return hashlib.sha256(raw.encode()).hexdigest()


def password_fingerprint(user):
    return salted_hmac(FINGERPRINT_SALT, user.password, algorithm='sha256').hexdigest()


def _raw_token(request):
    raw = request.COOKIES.get(COOKIE_NAME, '') if request is not None else ''
    if not raw or len(raw) > MAX_COOKIE_LENGTH:
        return None
    return raw


def is_trusted(request, user):
    raw = _raw_token(request)
    if not raw or user is None or not user.pk or not user.is_active or not user.is_email_confirmed:
        return False
    trusted = TrustedBrowser.objects.filter(
        token_hash=_hash_token(raw), user_id=user.pk, expires_at__gt=timezone.now(),
    ).first()
    return trusted is not None and constant_time_compare(
        trusted.password_fingerprint, password_fingerprint(user),
    )


def issue(request, response, user):
    previous = _raw_token(request)
    if previous:
        TrustedBrowser.objects.filter(token_hash=_hash_token(previous)).delete()
    raw = secrets.token_urlsafe(32)
    now = timezone.now()
    TrustedBrowser.objects.create(
        user=user,
        token_hash=_hash_token(raw),
        password_fingerprint=password_fingerprint(user),
        created_at=now,
        expires_at=now + TRUST_AGE,
    )
    response.set_cookie(
        COOKIE_NAME,
        raw,
        max_age=int(TRUST_AGE.total_seconds()),
        path='/',
        secure=settings.SESSION_COOKIE_SECURE,
        httponly=True,
        samesite='Lax',
    )


def revoke(request, response):
    raw = _raw_token(request)
    if raw:
        TrustedBrowser.objects.filter(token_hash=_hash_token(raw)).delete()
    response.delete_cookie(COOKIE_NAME, path='/', samesite='Lax')