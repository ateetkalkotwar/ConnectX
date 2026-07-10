from .models import (
    Meeting,
    MeetingParticipant,
)


class MeetingModerationError(
    ValueError
):
    pass


def validate_host_moderation(
    *,
    host,
    meeting,
):

    if meeting.host_id != host.pk:

        raise MeetingModerationError(
            "Only the meeting host can "
            "moderate participants."
        )


    if not meeting.host_moderation_enabled:

        raise MeetingModerationError(
            "Host moderation is disabled "
            "for this meeting."
        )


def get_target_participant(
    *,
    host,
    meeting,
    participant_id,
):

    validate_host_moderation(
        host=host,
        meeting=meeting,
    )


    participant = (
        MeetingParticipant.objects
        .select_related(
            "user"
        )
        .filter(
            pk=participant_id,
            meeting=meeting,
        )
        .first()
    )


    if participant is None:

        raise MeetingModerationError(
            "Participant was not found."
        )


    if participant.user.pk == host.pk:

        raise MeetingModerationError(
            "The host cannot moderate "
            "their own participant account."
        )


    return participant


def mute_participant(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.is_muted = True


    participant.save(
        update_fields=[
            "is_muted",
            "updated_at",
        ]
    )


    return participant


def turn_off_participant_camera(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.is_video_enabled = False


    participant.save(
        update_fields=[
            "is_video_enabled",
            "updated_at",
        ]
    )


    return participant


def restrict_participant_microphone(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.is_muted = True

    participant.forced_muted = True


    participant.save(
        update_fields=[
            "is_muted",
            "forced_muted",
            "updated_at",
        ]
    )


    return participant


def allow_participant_microphone(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.forced_muted = False


    participant.save(
        update_fields=[
            "forced_muted",
            "updated_at",
        ]
    )


    return participant


def restrict_participant_camera(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.is_video_enabled = False

    participant.forced_video_disabled = True


    participant.save(
        update_fields=[
            "is_video_enabled",
            "forced_video_disabled",
            "updated_at",
        ]
    )


    return participant


def allow_participant_camera(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.forced_video_disabled = False


    participant.save(
        update_fields=[
            "forced_video_disabled",
            "updated_at",
        ]
    )


    return participant


def remove_participant(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.is_present = False


    participant.save(
        update_fields=[
            "is_present",
            "updated_at",
        ]
    )


    return participant


def remove_and_block_participant(
    *,
    host,
    meeting,
    participant_id,
):

    participant = get_target_participant(
        host=host,
        meeting=meeting,
        participant_id=participant_id,
    )


    participant.is_present = False

    participant.blocked_from_rejoining = True


    participant.save(
        update_fields=[
            "is_present",
            "blocked_from_rejoining",
            "updated_at",
        ]
    )


    return participant