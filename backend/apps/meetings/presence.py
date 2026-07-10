from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import (
    MeetingParticipant,
    MeetingPresenceSession,
)


# ==========================================================
# PRESENCE CONFIGURATION
# ==========================================================


PRESENCE_RECONNECT_GRACE_SECONDS = 10

PRESENCE_STALE_SECONDS = 60


# ==========================================================
# CREATE PRESENCE SESSION
# ==========================================================


@transaction.atomic
def connect_presence(
    *,
    participant,
    channel_name,
    session_key="",
):

    now = timezone.now()


    locked_participant = (
        MeetingParticipant.objects
        .select_for_update()
        .get(
            pk=participant.pk,
        )
    )


    active_session_exists = (
        MeetingPresenceSession.objects
        .filter(
            participant=locked_participant,
            disconnected_at__isnull=True,
        )
        .exists()
    )


    presence_session = (
        MeetingPresenceSession.objects.create(
            participant=locked_participant,
            channel_name=channel_name,
            session_key=(
                session_key
                or
                ""
            ),
            last_seen_at=now,
        )
    )


    participant_became_present = (
        not active_session_exists
    )


    if not locked_participant.is_present:

        locked_participant.is_present = True

        locked_participant.left_at = None


        locked_participant.save(
            update_fields=[
                "is_present",
                "left_at",
                "updated_at",
            ]
        )


    return (
        presence_session,
        participant_became_present,
    )


# ==========================================================
# TOUCH PRESENCE SESSION
# ==========================================================


def touch_presence(
    *,
    channel_name,
):

    now = timezone.now()


    updated_count = (
        MeetingPresenceSession.objects
        .filter(
            channel_name=channel_name,
            disconnected_at__isnull=True,
        )
        .update(
            last_seen_at=now,
            updated_at=now,
        )
    )


    return (
        updated_count > 0
    )


# ==========================================================
# COUNT ACTIVE PRESENCE SESSIONS
# ==========================================================


def count_active_presence_sessions(
    *,
    participant,
):

    return (
        MeetingPresenceSession.objects
        .filter(
            participant=participant,
            disconnected_at__isnull=True,
        )
        .count()
    )


# ==========================================================
# DISCONNECT PRESENCE SESSION
# ==========================================================


@transaction.atomic
def disconnect_presence(
    *,
    channel_name,
):

    now = timezone.now()


    presence_session = (
        MeetingPresenceSession.objects
        .select_for_update()
        .select_related(
            "participant",
        )
        .filter(
            channel_name=channel_name,
            disconnected_at__isnull=True,
        )
        .first()
    )


    if presence_session is None:

        return None


    presence_session.disconnected_at = now

    presence_session.last_seen_at = now


    presence_session.save(
        update_fields=[
            "disconnected_at",
            "last_seen_at",
            "updated_at",
        ]
    )


    return presence_session


# ==========================================================
# SYNCHRONIZE PARTICIPANT PRESENCE
# ==========================================================


@transaction.atomic
def synchronize_participant_presence(
    *,
    participant_id,
):

    participant = (
        MeetingParticipant.objects
        .select_for_update()
        .select_related(
            "user",
        )
        .filter(
            pk=participant_id,
        )
        .first()
    )


    if participant is None:

        return None, False


    active_session_exists = (
        MeetingPresenceSession.objects
        .filter(
            participant=participant,
            disconnected_at__isnull=True,
        )
        .exists()
    )


    participant_became_absent = (
        participant.is_present
        and
        not active_session_exists
    )


    if participant_became_absent:

        participant.is_present = False

        participant.left_at = timezone.now()

        participant.is_screen_sharing = False


        participant.save(
            update_fields=[
                "is_present",
                "left_at",
                "is_screen_sharing",
                "updated_at",
            ]
        )


    elif (
        active_session_exists
        and
        not participant.is_present
    ):

        participant.is_present = True

        participant.left_at = None


        participant.save(
            update_fields=[
                "is_present",
                "left_at",
                "updated_at",
            ]
        )


    return (
        participant,
        participant_became_absent,
    )


# ==========================================================
# EXPIRE STALE PRESENCE SESSIONS
# ==========================================================


@transaction.atomic
def expire_stale_presence_sessions():

    now = timezone.now()


    stale_before = (
        now
        -
        timedelta(
            seconds=PRESENCE_STALE_SECONDS,
        )
    )


    stale_sessions = list(
        MeetingPresenceSession.objects
        .select_for_update()
        .filter(
            disconnected_at__isnull=True,
            last_seen_at__lt=stale_before,
        )
    )


    affected_participant_ids = set()


    for presence_session in stale_sessions:

        presence_session.disconnected_at = now

        presence_session.last_seen_at = now


        presence_session.save(
            update_fields=[
                "disconnected_at",
                "last_seen_at",
                "updated_at",
            ]
        )


        participant = getattr(
            presence_session,
            "participant",
            None,
        )


        participant_id = getattr(
            participant,
            "pk",
            None,
        )


        if participant_id is not None:

            affected_participant_ids.add(
                participant_id
            )


    return affected_participant_ids


# ==========================================================
# GET DISCONNECT GRACE DELAY
# ==========================================================


def get_presence_reconnect_grace_seconds():

    return (
        PRESENCE_RECONNECT_GRACE_SECONDS
    )