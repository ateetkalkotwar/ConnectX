from django.db import transaction
from django.utils import timezone

from .models import (
    Meeting,
    MeetingParticipant,
    MeetingPresenceSession,
)


@transaction.atomic
def create_instant_meeting(
    *,
    host,
    form,
):

    meeting = form.save(
        commit=False
    )

    meeting.host = host

    meeting.status = (
        Meeting.MeetingStatus.LIVE
    )

    meeting.started_at = (
        timezone.now()
    )

    meeting.save()


    MeetingParticipant.objects.create(
        meeting=meeting,
        user=host,
        role=(
            MeetingParticipant
            .ParticipantRole
            .HOST
        ),
        is_present=False,
    )


    return meeting


@transaction.atomic
def create_scheduled_meeting(
    *,
    host,
    form,
):

    meeting = form.save(
        commit=False
    )

    meeting.host = host

    meeting.status = (
        Meeting.MeetingStatus.SCHEDULED
    )

    meeting.save()


    MeetingParticipant.objects.create(
        meeting=meeting,
        user=host,
        role=(
            MeetingParticipant
            .ParticipantRole
            .HOST
        ),
        is_present=False,
    )


    return meeting


@transaction.atomic
def join_meeting(
    *,
    user,
    meeting,
):

    if (
        meeting.status
        == Meeting.MeetingStatus.ENDED
    ):

        raise ValueError(
            "This meeting has ended."
        )


    if (
        meeting.status
        == Meeting.MeetingStatus.CANCELLED
    ):

        raise ValueError(
            "This meeting has been cancelled."
        )


    if meeting.is_locked:

        if meeting.host.pk != user.pk:

            raise ValueError(
                "This meeting is locked."
            )


    participant = (
        MeetingParticipant.objects
        .select_for_update()
        .filter(
            meeting=meeting,
            user=user,
        )
        .first()
    )


    if (
        participant is not None
        and
        participant.blocked_from_rejoining
    ):

        raise ValueError(
            "You have been blocked from "
            "rejoining this meeting."
        )


    active_participant_count = (
        MeetingParticipant.objects
        .filter(
            meeting=meeting,
            presence_sessions__disconnected_at__isnull=True,
        )
        .distinct()
        .count()
    )


    if participant is None:

        if (
            active_participant_count
            >= meeting.max_participants
        ):

            raise ValueError(
                "This meeting has reached "
                "its participant limit."
            )


        participant = (
            MeetingParticipant.objects.create(
                meeting=meeting,
                user=user,
                role=(
                    MeetingParticipant
                    .ParticipantRole
                    .PARTICIPANT
                ),
                is_present=False,
            )
        )


        return participant


    participant_has_active_presence = (
        MeetingPresenceSession.objects
        .filter(
            participant=participant,
            disconnected_at__isnull=True,
        )
        .exists()
    )


    if (
        not participant_has_active_presence
        and
        active_participant_count
        >= meeting.max_participants
    ):

        raise ValueError(
            "This meeting has reached "
            "its participant limit."
        )


    participant.is_screen_sharing = False


    participant.save(
        update_fields=[
            "is_screen_sharing",
            "updated_at",
        ]
    )


    return participant


@transaction.atomic
def leave_meeting(
    *,
    user,
    meeting,
):

    participant = (
        MeetingParticipant.objects
        .select_for_update()
        .filter(
            meeting=meeting,
            user=user,
        )
        .first()
    )


    if participant is None:

        return None


    now = timezone.now()


    MeetingPresenceSession.objects.filter(
        participant=participant,
        disconnected_at__isnull=True,
    ).update(
        disconnected_at=now,
        last_seen_at=now,
        updated_at=now,
    )


    participant.is_present = False

    participant.left_at = now

    participant.is_screen_sharing = False


    participant.save(
        update_fields=[
            "is_present",
            "left_at",
            "is_screen_sharing",
            "updated_at",
        ]
    )


    return participant