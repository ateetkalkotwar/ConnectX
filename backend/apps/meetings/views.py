import json

from asgiref.sync import async_to_sync

from channels.layers import (
    get_channel_layer,
)

from django.contrib.auth.decorators import (
    login_required,
)

from django.http import (
    JsonResponse,
)

from django.shortcuts import (
    get_object_or_404,
    redirect,
    render,
)

from django.views.decorators.http import (
    require_POST,
)

from .forms import (
    CreateMeetingForm,
    JoinMeetingForm,
    ScheduleMeetingForm,
)

from .models import (
    Meeting,
    MeetingParticipant,
)

from .moderation import (
    MeetingModerationError,
    allow_participant_camera,
    allow_participant_microphone,
    mute_participant,
    remove_and_block_participant,
    remove_participant,
    restrict_participant_camera,
    restrict_participant_microphone,
    turn_off_participant_camera,
)

from .services import (
    create_instant_meeting,
    create_scheduled_meeting,
    join_meeting,
    leave_meeting,
)


# ==========================================================
# MEETINGS
# ==========================================================


@login_required
def meetings_view(
    request,
):

    hosted_meetings = (
        Meeting.objects
        .filter(
            host=request.user,
        )
        .order_by(
            "-created_at",
        )
    )


    joined_meetings = (
        Meeting.objects
        .filter(
            participants__user=request.user,
        )
        .exclude(
            host=request.user,
        )
        .distinct()
        .order_by(
            "-created_at",
        )
    )


    return render(
        request,
        "meetings/meetings.html",
        {
            "hosted_meetings": (
                hosted_meetings
            ),
            "joined_meetings": (
                joined_meetings
            ),
        },
    )


# ==========================================================
# CREATE MEETING
# ==========================================================


@login_required
def create_meeting_view(
    request,
):

    if request.method == "POST":

        form = CreateMeetingForm(
            request.POST
        )


        if form.is_valid():

            meeting = (
                create_instant_meeting(
                    host=request.user,
                    form=form,
                )
            )


            return redirect(
                "meeting_room",
                meeting_code=(
                    meeting.meeting_code
                ),
            )


    else:

        form = CreateMeetingForm()


    return render(
        request,
        "meetings/create_meeting.html",
        {
            "form": form,
        },
    )


# ==========================================================
# JOIN MEETING
# ==========================================================


@login_required
def join_meeting_view(
    request,
):

    if request.method == "POST":

        form = JoinMeetingForm(
            request.POST
        )


        if form.is_valid():

            meeting = form.meeting


            try:

                join_meeting(
                    user=request.user,
                    meeting=meeting,
                )


            except ValueError as error:

                form.add_error(
                    "meeting_code",
                    str(error),
                )


            else:

                return redirect(
                    "meeting_room",
                    meeting_code=(
                        meeting.meeting_code
                    ),
                )


    else:

        form = JoinMeetingForm()


    return render(
        request,
        "meetings/join_meeting.html",
        {
            "form": form,
        },
    )


# ==========================================================
# SCHEDULE MEETING
# ==========================================================


@login_required
def schedule_meeting_view(
    request,
):

    if request.method == "POST":

        form = ScheduleMeetingForm(
            request.POST
        )


        if form.is_valid():

            create_scheduled_meeting(
                host=request.user,
                form=form,
            )


            return redirect(
                "meetings"
            )


    else:

        form = ScheduleMeetingForm()


    return render(
        request,
        "meetings/schedule_meeting.html",
        {
            "form": form,
        },
    )


# ==========================================================
# MEETING ROOM
# ==========================================================


@login_required
def meeting_room_view(
    request,
    meeting_code,
):

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )


    if (
        meeting.status
        == Meeting.MeetingStatus.ENDED
    ):

        return redirect(
            "meetings"
        )


    if (
        meeting.status
        == Meeting.MeetingStatus.CANCELLED
    ):

        return redirect(
            "meetings"
        )


    participant = (
        MeetingParticipant.objects
        .filter(
            meeting=meeting,
            user=request.user,
        )
        .first()
    )


    if participant is None:

        return redirect(
            "join_meeting"
        )


    try:

        participant = join_meeting(
            user=request.user,
            meeting=meeting,
        )


    except ValueError:

        return redirect(
            "join_meeting"
        )


    active_participants = (
        MeetingParticipant.objects
        .filter(
            meeting=meeting,
            is_present=True,
        )
        .select_related(
            "user",
        )
        .order_by(
            "joined_at",
        )
    )


    return render(
        request,
        "meetings/meeting_room.html",
        {
            "meeting": meeting,
            "participant": participant,
            "active_participants": (
                active_participants
            ),
        },
    )


# ==========================================================
# LEAVE MEETING
# ==========================================================


@login_required
@require_POST
def leave_meeting_view(
    request,
    meeting_code,
):

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )


    participant = leave_meeting(
        user=request.user,
        meeting=meeting,
    )


    if participant is None:

        return redirect(
            "meetings"
        )


    channel_layer = (
        get_channel_layer()
    )


    if channel_layer is not None:

        room_group_name = (
            f"meeting_{meeting.meeting_code}"
        )


        async_to_sync(
            channel_layer.group_send
        )(
            room_group_name,
            {
                "type": (
                    "participant_left"
                ),
                "participant_id": (
                    participant.pk
                ),
                "user_id": (
                    request.user.pk
                ),
                "username": (
                    request.user.username
                ),
            },
        )


    return redirect(
        "meetings"
    )


# ==========================================================
# UPDATE PARTICIPANT STATE
# ==========================================================


@login_required
@require_POST
def update_participant_state_view(
    request,
    meeting_code,
):

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )


    participant = (
        MeetingParticipant.objects
        .select_related(
            "user",
        )
        .filter(
            meeting=meeting,
            user=request.user,
            is_present=True,
        )
        .first()
    )


    if participant is None:

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "You are not an "
                    "active participant."
                ),
            },
            status=403,
        )


    try:

        data = json.loads(
            request.body
        )


    except json.JSONDecodeError:

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Invalid JSON data."
                ),
            },
            status=400,
        )


    state = data.get(
        "state"
    )


    value = data.get(
        "value"
    )


    allowed_states = {
        "is_muted",
        "is_video_enabled",
        "is_screen_sharing",
    }


    if state not in allowed_states:

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Invalid participant state."
                ),
            },
            status=400,
        )


    if not isinstance(
        value,
        bool,
    ):

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "State value must be "
                    "a boolean."
                ),
            },
            status=400,
        )


    if (
        state == "is_muted"
        and
        participant.forced_muted
        and
        value is False
    ):

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Your microphone is "
                    "restricted by the host."
                ),
            },
            status=403,
        )


    if (
        state == "is_video_enabled"
        and
        participant.forced_video_disabled
        and
        value is True
    ):

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Your camera is "
                    "restricted by the host."
                ),
            },
            status=403,
        )


    setattr(
        participant,
        state,
        value,
    )


    participant.save(
        update_fields=[
            state,
            "updated_at",
        ]
    )


    channel_layer = (
        get_channel_layer()
    )


    if channel_layer is not None:

        room_group_name = (
            f"meeting_{meeting.meeting_code}"
        )


        async_to_sync(
            channel_layer.group_send
        )(
            room_group_name,
            {
                "type": (
                    "participant_state_changed"
                ),
                "participant_id": (
                    participant.pk
                ),
                "user_id": (
                    request.user.pk
                ),
                "username": (
                    request.user.username
                ),
                "is_muted": (
                    participant.is_muted
                ),
                "is_video_enabled": (
                    participant.is_video_enabled
                ),
                "is_screen_sharing": (
                    participant.is_screen_sharing
                ),
                "forced_muted": (
                    participant.forced_muted
                ),
                "forced_video_disabled": (
                    participant
                    .forced_video_disabled
                ),
            },
        )


    return JsonResponse(
        {
            "success": True,
            "participant": {
                "id": (
                    participant.pk
                ),
                "user_id": (
                    request.user.pk
                ),
                "username": (
                    participant
                    .user
                    .username
                ),
                "is_muted": (
                    participant.is_muted
                ),
                "is_video_enabled": (
                    participant.is_video_enabled
                ),
                "is_screen_sharing": (
                    participant.is_screen_sharing
                ),
                "forced_muted": (
                    participant.forced_muted
                ),
                "forced_video_disabled": (
                    participant
                    .forced_video_disabled
                ),
            },
        }
    )


# ==========================================================
# MODERATE PARTICIPANT
# ==========================================================


@login_required
@require_POST
def moderate_participant_view(
    request,
    meeting_code,
    participant_id,
):

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )


    try:

        data = json.loads(
            request.body
        )


    except json.JSONDecodeError:

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Invalid JSON data."
                ),
            },
            status=400,
        )


    action = data.get(
        "action"
    )


    moderation_actions = {
        "mute": mute_participant,
        "turn_off_camera": (
            turn_off_participant_camera
        ),
        "restrict_microphone": (
            restrict_participant_microphone
        ),
        "allow_microphone": (
            allow_participant_microphone
        ),
        "restrict_camera": (
            restrict_participant_camera
        ),
        "allow_camera": (
            allow_participant_camera
        ),
        "remove": remove_participant,
        "remove_and_block": (
            remove_and_block_participant
        ),
    }


    moderation_action = (
        moderation_actions.get(
            action
        )
    )


    if moderation_action is None:

        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Invalid moderation action."
                ),
            },
            status=400,
        )


    try:

        participant = moderation_action(
            host=request.user,
            meeting=meeting,
            participant_id=participant_id,
        )


    except MeetingModerationError as error:

        return JsonResponse(
            {
                "success": False,
                "error": str(error),
            },
            status=403,
        )


    channel_layer = (
        get_channel_layer()
    )


    if channel_layer is not None:

        room_group_name = (
            f"meeting_{meeting.meeting_code}"
        )


        async_to_sync(
            channel_layer.group_send
        )(
            room_group_name,
            {
                "type": (
                    "participant_moderated"
                ),
                "action": action,
                "participant_id": (
                    participant.pk
                ),
                "user_id": (
                    participant.user.pk
                ),
                "username": (
                    participant.user.username
                ),
                "is_muted": (
                    participant.is_muted
                ),
                "is_video_enabled": (
                    participant.is_video_enabled
                ),
                "is_screen_sharing": (
                    participant.is_screen_sharing
                ),
                "forced_muted": (
                    participant.forced_muted
                ),
                "forced_video_disabled": (
                    participant
                    .forced_video_disabled
                ),
                "blocked_from_rejoining": (
                    participant
                    .blocked_from_rejoining
                ),
            },
        )


    return JsonResponse(
        {
            "success": True,
            "action": action,
            "participant": {
                "id": (
                    participant.pk
                ),
                "user_id": (
                    participant.user.pk
                ),
                "username": (
                    participant.user.username
                ),
                "is_muted": (
                    participant.is_muted
                ),
                "is_video_enabled": (
                    participant.is_video_enabled
                ),
                "is_screen_sharing": (
                    participant.is_screen_sharing
                ),
                "forced_muted": (
                    participant.forced_muted
                ),
                "forced_video_disabled": (
                    participant
                    .forced_video_disabled
                ),
                "blocked_from_rejoining": (
                    participant
                    .blocked_from_rejoining
                ),
            },
        }
    )