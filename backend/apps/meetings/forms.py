from django import forms
from django.utils import timezone

from .models import Meeting


class CreateMeetingForm(forms.ModelForm):

    class Meta:

        model = Meeting

        fields = (
            "title",
            "description",
            "max_participants",
            "requires_approval",
        )

    def clean_title(self):

        title = self.cleaned_data["title"].strip()

        if not title:

            raise forms.ValidationError(
                "Meeting title is required."
            )

        return title


class JoinMeetingForm(forms.Form):

    meeting_code = forms.CharField(
        max_length=12
    )

    def clean_meeting_code(self):

        meeting_code = (
            self.cleaned_data["meeting_code"]
            .strip()
            .lower()
        )

        try:

            meeting = Meeting.objects.get(
                meeting_code=meeting_code
            )

        except Meeting.DoesNotExist:

            raise forms.ValidationError(
                "Meeting not found. Check the meeting code."
            )

        if meeting.status == Meeting.MeetingStatus.ENDED:

            raise forms.ValidationError(
                "This meeting has already ended."
            )

        if meeting.status == Meeting.MeetingStatus.CANCELLED:

            raise forms.ValidationError(
                "This meeting has been cancelled."
            )

        if meeting.is_locked:

            raise forms.ValidationError(
                "This meeting is currently locked."
            )

        self.meeting = meeting

        return meeting_code


class ScheduleMeetingForm(forms.ModelForm):

    class Meta:

        model = Meeting

        fields = (
            "title",
            "description",
            "scheduled_at",
            "max_participants",
            "requires_approval",
        )

        widgets = {
            "scheduled_at": forms.DateTimeInput(
                attrs={
                    "type": "datetime-local"
                }
            )
        }

    def clean_title(self):

        title = self.cleaned_data["title"].strip()

        if not title:

            raise forms.ValidationError(
                "Meeting title is required."
            )

        return title

    def clean_scheduled_at(self):

        scheduled_at = self.cleaned_data["scheduled_at"]

        if scheduled_at is None:

            raise forms.ValidationError(
                "Meeting date and time are required."
            )

        if scheduled_at <= timezone.now():

            raise forms.ValidationError(
                "Meeting must be scheduled for a future time."
            )

        return scheduled_at