from django.contrib import admin

from .models import (
    Meeting,
    MeetingInvitation,
    MeetingParticipant,
)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):

    list_display = (
        "title",
        "meeting_code",
        "host",
        "status",
        "scheduled_at",
        "is_locked",
        "created_at",
    )

    list_filter = (
        "status",
        "is_locked",
        "requires_approval",
        "created_at",
    )

    search_fields = (
        "title",
        "meeting_code",
        "host__username",
        "host__email",
    )

    readonly_fields = (
        "meeting_code",
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )


@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "meeting",
        "role",
        "is_present",
        "is_muted",
        "is_video_enabled",
        "is_screen_sharing",
        "joined_at",
    )

    list_filter = (
        "role",
        "is_present",
        "is_muted",
        "is_video_enabled",
        "is_screen_sharing",
    )

    search_fields = (
        "user__username",
        "user__email",
        "meeting__title",
        "meeting__meeting_code",
    )

    readonly_fields = (
        "joined_at",
        "created_at",
        "updated_at",
    )

    ordering = (
        "-joined_at",
    )


@admin.register(MeetingInvitation)
class MeetingInvitationAdmin(admin.ModelAdmin):

    list_display = (
        "invited_user",
        "meeting",
        "invited_by",
        "status",
        "created_at",
        "responded_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "invited_user__username",
        "invited_user__email",
        "invited_by__username",
        "meeting__title",
        "meeting__meeting_code",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )