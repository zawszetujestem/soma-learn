from django import forms
from django.contrib.auth.forms import AuthenticationForm

from .models import User


class MentorLoginForm(AuthenticationForm):
    username = forms.EmailField(label="Email", max_length=254)


class RegistrationForm(forms.Form):
    email = forms.EmailField(label="Email", max_length=254)
    password1 = forms.CharField(label="Hasło", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Powtórz hasło", widget=forms.PasswordInput)
    role = forms.ChoiceField(
        label="Rola",
        choices=[("student", "Uczeń"), ("mentor", "Mentor")],
        widget=forms.RadioSelect,
        initial="student",
        required=False,
    )

    def clean_email(self) -> str:
        email = self.cleaned_data["email"]
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Konto z tym adresem e-mail już istnieje.")
        return email

    def clean(self) -> dict[str, object]:
        cleaned = super().clean()
        if cleaned is None:
            return {}
        password1 = cleaned.get("password1")
        password2 = cleaned.get("password2")
        if password1 and password2 and password1 != password2:
            self.add_error("password2", "Hasła nie są identyczne.")
        return cleaned

    def save(self) -> User:
        is_mentor = self.cleaned_data.get("role") == "mentor"
        return User.objects.create_user(
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password1"],
            is_mentor=is_mentor,
            is_student=not is_mentor,
        )
