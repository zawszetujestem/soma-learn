from django.core.exceptions import PermissionDenied
from django.conf import settings
from allauth.core import ratelimit
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.headless.base.response import RateLimitResponse

from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from .models import User


class SomaAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        return False

    def authenticate(self, request, **credentials):
        user = super().authenticate(request, **credentials)
        if user and user.is_active and user.is_email_confirmed:
            return user
        return None

    def get_email_confirmation_url(self, request, emailconfirmation):
        return settings.HEADLESS_FRONTEND_URLS['account_confirm_email'].format(key=emailconfirmation.key)

    def send_mail(self, template_prefix, email, context):
        if template_prefix == 'account/email/login_code':
            request = context.get('request')
            if request:
                for dry_run in (True, False):
                    for action in ('login_code_resend', 'login_code_send'):
                        if not ratelimit.consume(
                            request, action=action, key=email.strip().casefold(), dry_run=dry_run,
                        ):
                            raise ImmediateHttpResponse(RateLimitResponse(request))
        return super().send_mail(template_prefix, email, context)


class SomaSocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, sociallogin):
        return False

    def authenticate_by_email(self, sociallogin):
        if sociallogin.provider.id != 'google':
            return None
        for address in sociallogin.email_addresses:
            if not address.verified or not self.can_authenticate_by_email(sociallogin, address.email):
                continue
            email = address.email.strip().lower()
            users = list(User.objects.filter(email__iexact=email)[:2])
            if len(users) == 1 and users[0].is_active and users[0].is_email_confirmed:
                return users[0], email
        return None

    def pre_social_login(self, request, sociallogin):
        user = sociallogin.user
        if not sociallogin.is_existing or not user.is_active or not user.is_email_confirmed:
            raise PermissionDenied

        if sociallogin.provider.id != 'google':
            raise PermissionDenied

        verified_emails = {
            address.email.casefold()
            for address in sociallogin.email_addresses
            if address.verified
        }
        if user.email.casefold() not in verified_emails:
            raise PermissionDenied
        if User.objects.filter(email__iexact=user.email).count() != 1:
            raise PermissionDenied
        if not EmailAddress.objects.filter(user=user, email__iexact=user.email, verified=True).exists():
            raise PermissionDenied
