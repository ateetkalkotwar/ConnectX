import json

from channels.db import (
    database_sync_to_async,
)

from channels.generic.websocket import (
    AsyncWebsocketConsumer,
)

from channels.layers import (
    get_channel_layer,
)

from apps.meetings.models import (
    MeetingParticipant,
)


# ==========================================================
# SIGNALING CONSUMER
# ==========================================================


class SignalingConsumer(
    AsyncWebsocketConsumer
):

    # ======================================================
    # CONNECT
    # ======================================================


    async def connect(
        self,
    ):

        self.user = self.scope[
            "user"
        ]


        if not self.user.is_authenticated:

            await self.close(
                code=4001,
            )

            return


        self.meeting_code = (
            self.scope[
                "url_route"
            ][
                "kwargs"
            ][
                "meeting_code"
            ]
        )


        participant = (
            await self.get_participant()
        )


        if participant is None:

            await self.close(
                code=4004,
            )

            return


        if participant.blocked_from_rejoining:

            await self.close(
                code=4003,
            )

            return


        self.participant = participant


        self.signaling_group_name = (
            f"signaling_{self.meeting_code}"
        )


        channel_layer = (
            get_channel_layer()
        )


        if channel_layer is None:

            await self.close(
                code=4500,
            )

            return


        await channel_layer.group_add(
            self.signaling_group_name,
            self.channel_name,
        )


        await self.accept()


        await channel_layer.group_send(
            self.signaling_group_name,
            {
                "type": (
                    "signaling_peer_ready"
                ),
                "user_id": (
                    self.user.pk
                ),
                "username": (
                    self.user.username
                ),
            },
        )


        print(
            "ConnectX signaling socket connected:",
            {
                "meeting_code": (
                    self.meeting_code
                ),
                "user_id": getattr(
                    self.user,
                    "pk",
                    None,
                ),
                "participant_id": getattr(
                    self.participant,
                    "pk",
                    None,
                ),
                "channel_name": (
                    self.channel_name
                ),
            },
        )


    # ======================================================
    # DISCONNECT
    # ======================================================


    async def disconnect(
        self,
        code,
    ):

        signaling_group_name = getattr(
            self,
            "signaling_group_name",
            None,
        )


        channel_layer = (
            get_channel_layer()
        )


        if (
            channel_layer is not None
            and
            signaling_group_name is not None
        ):

            await channel_layer.group_discard(
                signaling_group_name,
                self.channel_name,
            )


        print(
            "ConnectX signaling socket disconnected:",
            {
                "meeting_code": getattr(
                    self,
                    "meeting_code",
                    None,
                ),
                "user_id": getattr(
                    getattr(
                        self,
                        "user",
                        None,
                    ),
                    "pk",
                    None,
                ),
                "participant_id": getattr(
                    getattr(
                        self,
                        "participant",
                        None,
                    ),
                    "pk",
                    None,
                ),
                "code": code,
            },
        )


    # ======================================================
    # RECEIVE
    # ======================================================


    async def receive(
        self,
        text_data=None,
        bytes_data=None,
    ):

        if text_data is None:

            return


        try:

            data = json.loads(
                text_data
            )

        except json.JSONDecodeError:

            await self.send_error(
                message="Invalid JSON data.",
            )

            return


        message_type = data.get(
            "type"
        )


        if message_type == "ping":

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "pong",
                    }
                )
            )

            return


        allowed_signal_types = {
            "webrtc_offer",
            "webrtc_answer",
            "webrtc_ice_candidate",
        }


        if (
            message_type
            not in allowed_signal_types
        ):

            await self.send_error(
                message=(
                    "Unsupported signaling "
                    "message type."
                ),
            )

            return


        await self.forward_signal(
            data=data,
            signal_type=message_type,
        )


    # ======================================================
    # FORWARD SIGNAL
    # ======================================================


    async def forward_signal(
        self,
        *,
        data,
        signal_type,
    ):

        target_user_id = data.get(
            "target_user_id"
        )


        payload = data.get(
            "payload"
        )


        if target_user_id is None:

            await self.send_error(
                message=(
                    "Target user is required."
                ),
            )

            return


        try:

            target_user_id = int(
                target_user_id
            )

        except (
            TypeError,
            ValueError,
        ):

            await self.send_error(
                message=(
                    "Target user is invalid."
                ),
            )

            return


        current_user_id = getattr(
            self.user,
            "pk",
            None,
        )


        if current_user_id is None:

            await self.send_error(
                message=(
                    "Current signaling user "
                    "is invalid."
                ),
            )

            return


        if (
            target_user_id
            == current_user_id
        ):

            await self.send_error(
                message=(
                    "Cannot send a WebRTC "
                    "signal to yourself."
                ),
            )

            return


        if payload is None:

            await self.send_error(
                message=(
                    "WebRTC signal payload "
                    "is required."
                ),
            )

            return


        target_participant_exists = (
            await self.target_participant_exists(
                target_user_id=target_user_id,
            )
        )


        if not target_participant_exists:

            await self.send_error(
                message=(
                    "Target participant is "
                    "not available."
                ),
            )

            return


        channel_layer = (
            get_channel_layer()
        )


        if channel_layer is None:

            await self.send_error(
                message=(
                    "Signaling channel layer "
                    "is unavailable."
                ),
            )

            return


        await channel_layer.group_send(
            self.signaling_group_name,
            {
                "type": "webrtc_signal",
                "signal_type": (
                    signal_type
                ),
                "sender_user_id": (
                    current_user_id
                ),
                "sender_username": (
                    self.user.username
                ),
                "target_user_id": (
                    target_user_id
                ),
                "payload": payload,
            },
        )


    # ======================================================
    # SIGNALING PEER READY EVENT
    # ======================================================


    async def signaling_peer_ready(
        self,
        event,
    ):

        current_user_id = getattr(
            self.user,
            "pk",
            None,
        )


        if (
            event["user_id"]
            == current_user_id
        ):

            return


        await self.send(
            text_data=json.dumps(
                {
                    "type": (
                        "signaling_peer_ready"
                    ),
                    "user_id": event[
                        "user_id"
                    ],
                    "username": event[
                        "username"
                    ],
                }
            )
        )


    # ======================================================
    # WEBRTC SIGNAL EVENT
    # ======================================================


    async def webrtc_signal(
        self,
        event,
    ):

        current_user_id = getattr(
            self.user,
            "pk",
            None,
        )


        if (
            current_user_id
            != event["target_user_id"]
        ):

            return


        await self.send(
            text_data=json.dumps(
                {
                    "type": event[
                        "signal_type"
                    ],
                    "sender_user_id": event[
                        "sender_user_id"
                    ],
                    "sender_username": event[
                        "sender_username"
                    ],
                    "payload": event[
                        "payload"
                    ],
                }
            )
        )


    # ======================================================
    # SEND ERROR
    # ======================================================


    async def send_error(
        self,
        *,
        message,
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": "error",
                    "message": message,
                }
            )
        )


    # ======================================================
    # DATABASE: GET PARTICIPANT
    # ======================================================


    @database_sync_to_async
    def get_participant(
        self,
    ):

        return (
            MeetingParticipant.objects
            .select_related(
                "meeting",
                "user",
            )
            .filter(
                meeting__meeting_code=(
                    self.meeting_code
                ),
                user=self.user,
            )
            .first()
        )


    # ======================================================
    # DATABASE: TARGET PARTICIPANT EXISTS
    # ======================================================


    @database_sync_to_async
    def target_participant_exists(
        self,
        *,
        target_user_id,
    ):

        return (
            MeetingParticipant.objects
            .filter(
                meeting__meeting_code=(
                    self.meeting_code
                ),
                user__pk=target_user_id,
                blocked_from_rejoining=False,
                presence_sessions__disconnected_at__isnull=True,
            )
            .exists()
        )