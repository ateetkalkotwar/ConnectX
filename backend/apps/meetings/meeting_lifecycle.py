from datetime import timedelta

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .models import (
    Meeting,
    MeetingParticipant,
    MeetingPresenceSession,
)


LIVE_MEETING_EMPTY_TIMEOUT = timedelta(
    minutes=5,
)


def end_meeting_if_empty(
    *,
    meeting,
):
    """
    End a LIVE meeting when there are no
    active presence sessions.

    This is used after a participant has
    definitively left the meeting.
    """

    with transaction.atomic():

        locked_meeting = (
            Meeting.objects
            .select_for_update()
            .get(
                pk=meeting.pk,
            )
        )


        if (
            locked_meeting.status
            != Meeting.MeetingStatus.LIVE
        ):

            return False


        has_active_presence = (
            MeetingPresenceSession.objects
            .filter(
                participant__meeting=locked_meeting,
                disconnected_at__isnull=True,
            )
            .exists()
        )


        if has_active_presence:

            return False


        locked_meeting.status = (
            Meeting.MeetingStatus.ENDED
        )

        locked_meeting.ended_at = (
            timezone.now()
        )


        locked_meeting.save(
            update_fields=[
                "status",
                "ended_at",
                "updated_at",
            ]
        )


        return True


def cleanup_stale_live_meetings():
    """
    End LIVE meetings that have had no valid
    presence activity for the configured timeout.

    This is the safety cleanup used by the
    health endpoint / external monitor.
    """

    now = timezone.now()

    cutoff = (
        now
        -
        LIVE_MEETING_EMPTY_TIMEOUT
    )


    ended_count = 0


    live_meetings = (
        Meeting.objects
        .filter(
            status=Meeting.MeetingStatus.LIVE,
        )
        .only(
            "id",
            "started_at",
            "status",
            "ended_at",
        )
    )


    for meeting in live_meetings:

        with transaction.atomic():

            locked_meeting = (
                Meeting.objects
                .select_for_update()
                .get(
                    pk=meeting.pk,
                )
            )


            if (
                locked_meeting.status
                != Meeting.MeetingStatus.LIVE
            ):

                continue


            stale_sessions = (
                MeetingPresenceSession.objects
                .filter(
                    participant__meeting=(
                        locked_meeting
                    ),
                    disconnected_at__isnull=True,
                    last_seen_at__lt=cutoff,
                )
            )


            stale_participant_ids = list(
                stale_sessions
                .values_list(
                    "participant_id",
                    flat=True,
                )
                .distinct()
            )


            if stale_participant_ids:

                stale_sessions.update(
                    disconnected_at=now,
                    updated_at=now,
                )


                for participant_id in (
                    stale_participant_ids
                ):

                    has_other_active_session = (
                        MeetingPresenceSession.objects
                        .filter(
                            participant_id=(
                                participant_id
                            ),
                            disconnected_at__isnull=True,
                        )
                        .exists()
                    )


                    if not has_other_active_session:

                        MeetingParticipant.objects.filter(
                            pk=participant_id,
                        ).update(
                            is_present=False,
                            is_screen_sharing=False,
                            updated_at=now,
                        )


            has_active_presence = (
                MeetingPresenceSession.objects
                .filter(
                    participant__meeting=(
                        locked_meeting
                    ),
                    disconnected_at__isnull=True,
                )
                .exists()
            )


            if has_active_presence:

                continue


            latest_presence_activity = (
                MeetingPresenceSession.objects
                .filter(
                    participant__meeting=(
                        locked_meeting
                    ),
                )
                .aggregate(
                    latest_seen=Max(
                        "last_seen_at",
                    ),
                )
                .get(
                    "latest_seen",
                )
            )


            last_activity = (
                latest_presence_activity
                or
                locked_meeting.started_at
            )


            if (
                last_activity is not None
                and
                last_activity > cutoff
            ):

                continue


            locked_meeting.status = (
                Meeting.MeetingStatus.ENDED
            )

            locked_meeting.ended_at = now


            locked_meeting.save(
                update_fields=[
                    "status",
                    "ended_at",
                    "updated_at",
                ]
            )


            ended_count += 1


    return ended_count