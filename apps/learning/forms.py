from django import forms

from .models import Course


class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ["title"]


class AssignStudentForm(forms.Form):
    email = forms.EmailField(label="Email ucznia", max_length=254)
