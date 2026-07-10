from django.urls import path

from . import views


urlpatterns = [
    path(
        "",
        views.meetings_view,
        name="meetings",
    ),

    path(
        "new/",
        views.create_meeting_view,
        name="create_meeting",
    ),

    path(
        "join/",
        views.join_meeting_view,
        name="join_meeting",
    ),

    path(
        "schedule/",
        views.schedule_meeting_view,
        name="schedule_meeting",
    ),

    path(
        "<str:meeting_code>/leave/",
        views.leave_meeting_view,
        name="leave_meeting",
    ),

    path(
        "<str:meeting_code>/state/",
        views.update_participant_state_view,
        name="update_participant_state",
    ),

    path(
        (
            "<str:meeting_code>/participants/"
            "<int:participant_id>/moderate/"
        ),
        views.moderate_participant_view,
        name="moderate_participant",
    ),

    path(
        "<str:meeting_code>/",
        views.meeting_room_view,
        name="meeting_room",
    ),
]