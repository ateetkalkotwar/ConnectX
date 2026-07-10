from django import forms
from django.contrib.auth import get_user_model


User = get_user_model()


class RegisterForm(forms.ModelForm):

    password = forms.CharField(
        widget=forms.PasswordInput
    )

    confirm_password = forms.CharField(
        widget=forms.PasswordInput
    )

    terms = forms.BooleanField(
        required=True
    )

    class Meta:
        model = User

        fields = [
            "first_name",
            "last_name",
            "username",
            "email",
            "profile_picture",
        ]

    def clean_username(self):

        username = self.cleaned_data.get("username")

        if User.objects.filter(
            username__iexact=username
        ).exists():

            raise forms.ValidationError(
                "Username is already taken."
            )

        return username

    def clean_email(self):

        email = self.cleaned_data.get("email")

        if User.objects.filter(
            email__iexact=email
        ).exists():

            raise forms.ValidationError(
                "An account with this email already exists."
            )

        return email

    def clean(self):

        cleaned_data = super().clean()

        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get(
            "confirm_password"
        )

        if password and confirm_password:

            if password != confirm_password:

                self.add_error(
                    "confirm_password",
                    "Passwords do not match."
                )

        return cleaned_data

    def save(self, commit=True):

        user = super().save(commit=False)

        user.set_password(
            self.cleaned_data["password"]
        )

        if commit:
            user.save()

        return user
    
class LoginForm(forms.Form):

    username = forms.CharField(
        max_length=150
    )

    password = forms.CharField(
        widget=forms.PasswordInput
    )

    remember_me = forms.BooleanField(
        required=False
    )