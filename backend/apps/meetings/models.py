import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Meeting(models.Model):

    class MeetingStatus(models.TextChoices):

        SCHEDULED = "scheduled", "Scheduled"

        LIVE = "live", "Live"

        ENDED = "ended", "Ended"

        CANCELLED = "cancelled", "Cancelled"


    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hosted_meetings",
    )


    title = models.CharField(
        max_length=150,
    )


    meeting_code = models.CharField(
        max_length=12,
        unique=True,
        db_index=True,
        editable=False,
    )


    description = models.TextField(
        blank=True,
    )


    scheduled_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    started_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    ended_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    status = models.CharField(
        max_length=20,
        choices=MeetingStatus.choices,
        default=MeetingStatus.SCHEDULED,
        db_index=True,
    )


    max_participants = models.PositiveIntegerField(
        default=100,
    )


    requires_approval = models.BooleanField(
        default=False,
    )


    is_locked = models.BooleanField(
        default=False,
    )


    # ======================================================
    # HOST MODERATION
    # ======================================================

    host_moderation_enabled = models.BooleanField(
        default=True,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    class Meta:

        ordering = [
            "-created_at",
        ]


    def __str__(
        self,
    ):

        return (
            f"{self.title} - "
            f"{self.meeting_code}"
        )


    @staticmethod
    def generate_meeting_code():

        while True:

            code = secrets.token_hex(
                6
            )


            if not Meeting.objects.filter(
                meeting_code=code,
            ).exists():

                return code


    def save(
        self,
        *args,
        **kwargs,
    ):

        if not self.meeting_code:

            self.meeting_code = (
                self.generate_meeting_code()
            )


        super().save(
            *args,
            **kwargs,
        )


class MeetingParticipant(models.Model):

    class ParticipantRole(models.TextChoices):

        HOST = "host", "Host"

        CO_HOST = "co_host", "Co-host"

        PARTICIPANT = (
            "participant",
            "Participant",
        )


    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="participants",
    )


    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meeting_participations",
    )


    role = models.CharField(
        max_length=20,
        choices=ParticipantRole.choices,
        default=ParticipantRole.PARTICIPANT,
    )


    joined_at = models.DateTimeField(
        auto_now_add=True,
    )


    left_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    is_present = models.BooleanField(
        default=True,
    )


    # ======================================================
    # PARTICIPANT MEDIA STATE
    # ======================================================

    is_muted = models.BooleanField(
        default=False,
    )


    is_video_enabled = models.BooleanField(
        default=True,
    )


    is_screen_sharing = models.BooleanField(
        default=False,
    )


    # ======================================================
    # HOST MEDIA RESTRICTIONS
    # ======================================================

    forced_muted = models.BooleanField(
        default=False,
    )


    forced_video_disabled = models.BooleanField(
        default=False,
    )


    # ======================================================
    # MEETING ACCESS RESTRICTIONS
    # ======================================================

    blocked_from_rejoining = models.BooleanField(
        default=False,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    class Meta:

        ordering = [
            "-joined_at",
        ]


        constraints = [

            models.UniqueConstraint(
                fields=[
                    "meeting",
                    "user",
                ],
                name=(
                    "unique_meeting_participant"
                ),
            ),

        ]


    def __str__(
        self,
    ):

        return (
            f"{self.user.username} - "
            f"{self.meeting.meeting_code}"
        )


class MeetingPresenceSession(models.Model):

    participant = models.ForeignKey(
        MeetingParticipant,
        on_delete=models.CASCADE,
        related_name="presence_sessions",
    )


    connection_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
    )


    channel_name = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
    )


    session_key = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
    )


    connected_at = models.DateTimeField(
        auto_now_add=True,
    )


    last_seen_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )


    disconnected_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    class Meta:

        ordering = [
            "-connected_at",
        ]


        indexes = [

            models.Index(
                fields=[
                    "participant",
                    "disconnected_at",
                ],
                name=(
                    "meeting_presence_active_idx"
                ),
            ),


            models.Index(
                fields=[
                    "last_seen_at",
                ],
                name=(
                    "meeting_presence_seen_idx"
                ),
            ),

        ]


    def __str__(
        self,
    ):

        return (
            f"{self.participant.user.username} - "
            f"{self.participant.meeting.meeting_code} - "
            f"{self.connection_id}"
        )


    @property
    def is_connected(
        self,
    ):

        return (
            self.disconnected_at
            is None
        )
    

    
class MeetingInvitation(models.Model):

    class InvitationStatus(
        models.TextChoices
    ):

        PENDING = (
            "pending",
            "Pending",
        )

        ACCEPTED = (
            "accepted",
            "Accepted",
        )

        DECLINED = (
            "declined",
            "Declined",
        )

        CANCELLED = (
            "cancelled",
            "Cancelled",
        )


    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="invitations",
    )


    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name=(
            "sent_meeting_invitations"
        ),
    )


    invited_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name=(
            "received_meeting_invitations"
        ),
    )


    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
        db_index=True,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    responded_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    class Meta:

        ordering = [
            "-created_at",
        ]


        constraints = [

            models.UniqueConstraint(
                fields=[
                    "meeting",
                    "invited_user",
                ],
                name=(
                    "unique_meeting_invitation"
                ),
            ),

        ]


    def __str__(
        self,
    ):

        return (
            f"{self.invited_user.username} - "
            f"{self.meeting.meeting_code} - "
            f"{self.status}"
        )