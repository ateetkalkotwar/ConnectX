import asyncio
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

from .models import (
    MeetingParticipant,
)

from .presence import (
    connect_presence,
    disconnect_presence,
    get_presence_reconnect_grace_seconds,
    synchronize_participant_presence,
    touch_presence,
)


# ==========================================================
# MEETING CONSUMER
# ==========================================================


class MeetingConsumer(
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


        self.meeting_group_name = (
            f"meeting_{self.meeting_code}"
        )


        self.participant = None

        self.presence_session = None


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


        channel_layer = (
            get_channel_layer()
        )


        if channel_layer is None:

            await self.close(
                code=4500,
            )

            return


        await channel_layer.group_add(
            self.meeting_group_name,
            self.channel_name,
        )


        try:

            (
                self.presence_session,
                participant_became_present,
            ) = (
                await self.create_presence_session()
            )

        except Exception:

            await channel_layer.group_discard(
                self.meeting_group_name,
                self.channel_name,
            )

            raise


        await self.accept()


        if participant_became_present:

            await self.broadcast_participant_joined()

        else:

            await self.send_participant_state()


        print(
            "ConnectX meeting socket connected:",
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

        participant = getattr(
            self,
            "participant",
            None,
        )


        meeting_group_name = getattr(
            self,
            "meeting_group_name",
            None,
        )


        participant_id = getattr(
            participant,
            "pk",
            None,
        )


        if participant_id is not None:

            presence_session = (
                await self.close_presence_session()
            )


            if presence_session is not None:

                asyncio.create_task(
                    self.handle_presence_grace_period(
                        participant_id=participant_id,
                        meeting_group_name=(
                            meeting_group_name
                        ),
                    )
                )


        channel_layer = (
            get_channel_layer()
        )


        if (
            channel_layer is not None
            and
            meeting_group_name is not None
        ):

            await channel_layer.group_discard(
                meeting_group_name,
                self.channel_name,
            )


        print(
            "ConnectX meeting socket disconnected:",
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
                "participant_id": (
                    participant_id
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

            await self.touch_current_presence()


            await self.send(
                text_data=json.dumps(
                    {
                        "type": "pong",
                    }
                )
            )

            return


        await self.send_error(
            message=(
                "Unsupported meeting "
                "message type."
            ),
        )


    # ======================================================
    # PRESENCE GRACE PERIOD
    # ======================================================


    async def handle_presence_grace_period(
        self,
        *,
        participant_id,
        meeting_group_name,
    ):

        grace_seconds = (
            get_presence_reconnect_grace_seconds()
        )


        await asyncio.sleep(
            grace_seconds
        )


        (
            participant,
            participant_became_absent,
        ) = (
            await self.synchronize_presence(
                participant_id=participant_id,
            )
        )


        if participant is None:

            return


        if not participant_became_absent:

            return


        if meeting_group_name is None:

            return


        user = getattr(
            participant,
            "user",
            None,
        )


        user_id = getattr(
            user,
            "pk",
            None,
        )


        username = getattr(
            user,
            "username",
            "",
        )


        if user_id is None:

            return


        channel_layer = (
            get_channel_layer()
        )


        if channel_layer is None:

            return


        await channel_layer.group_send(
            meeting_group_name,
            {
                "type": "participant_left",
                "participant_id": (
                    participant_id
                ),
                "user_id": (
                    user_id
                ),
                "username": (
                    username
                ),
            },
        )


    # ======================================================
    # BROADCAST PARTICIPANT JOINED
    # ======================================================


    async def broadcast_participant_joined(
        self,
    ):

        channel_layer = (
            get_channel_layer()
        )


        if channel_layer is None:

            return


        participant_data = (
            await self.get_participant_event_data()
        )


        await channel_layer.group_send(
            self.meeting_group_name,
            {
                "type": "participant_joined",
                **participant_data,
            },
        )


    # ======================================================
    # SEND CURRENT PARTICIPANT STATE
    # ======================================================


    async def send_participant_state(
        self,
    ):

        participant_data = (
            await self.get_participant_event_data()
        )


        await self.send(
            text_data=json.dumps(
                {
                    "type": "participant_joined",
                    **participant_data,
                }
            )
        )


    # ======================================================
    # PARTICIPANT JOINED EVENT
    # ======================================================


    async def participant_joined(
        self,
        event,
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": (
                        "participant_joined"
                    ),
                    "participant_id": event[
                        "participant_id"
                    ],
                    "user_id": event[
                        "user_id"
                    ],
                    "username": event[
                        "username"
                    ],
                    "role": event[
                        "role"
                    ],
                    "is_muted": event[
                        "is_muted"
                    ],
                    "is_video_enabled": event[
                        "is_video_enabled"
                    ],
                    "is_screen_sharing": event[
                        "is_screen_sharing"
                    ],
                    "forced_muted": event[
                        "forced_muted"
                    ],
                    "forced_video_disabled": event[
                        "forced_video_disabled"
                    ],
                }
            )
        )


    # ======================================================
    # PARTICIPANT LEFT EVENT
    # ======================================================


    async def participant_left(
        self,
        event,
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": (
                        "participant_left"
                    ),
                    "participant_id": event[
                        "participant_id"
                    ],
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
    # PARTICIPANT STATE CHANGED EVENT
    # ======================================================


    async def participant_state_changed(
        self,
        event,
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": (
                        "participant_state_changed"
                    ),
                    "participant_id": event[
                        "participant_id"
                    ],
                    "user_id": event[
                        "user_id"
                    ],
                    "username": event[
                        "username"
                    ],
                    "is_muted": event[
                        "is_muted"
                    ],
                    "is_video_enabled": event[
                        "is_video_enabled"
                    ],
                    "is_screen_sharing": event[
                        "is_screen_sharing"
                    ],
                    "forced_muted": event[
                        "forced_muted"
                    ],
                    "forced_video_disabled": event[
                        "forced_video_disabled"
                    ],
                }
            )
        )


    # ======================================================
    # PARTICIPANT MODERATED EVENT
    # ======================================================


    async def participant_moderated(
        self,
        event,
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": (
                        "participant_moderated"
                    ),
                    "participant_id": event[
                        "participant_id"
                    ],
                    "user_id": event[
                        "user_id"
                    ],
                    "username": event[
                        "username"
                    ],
                    "action": event[
                        "action"
                    ],
                    "is_muted": event[
                        "is_muted"
                    ],
                    "is_video_enabled": event[
                        "is_video_enabled"
                    ],
                    "is_screen_sharing": event[
                        "is_screen_sharing"
                    ],
                    "forced_muted": event[
                        "forced_muted"
                    ],
                    "forced_video_disabled": event[
                        "forced_video_disabled"
                    ],
                    "blocked_from_rejoining": event[
                        "blocked_from_rejoining"
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
    # DATABASE: CREATE PRESENCE
    # ======================================================


    @database_sync_to_async
    def create_presence_session(
        self,
    ):

        session = self.scope.get(
            "session"
        )


        session_key = ""


        if session is not None:

            session_key = (
                session.session_key
                or
                ""
            )


        return connect_presence(
            participant=self.participant,
            channel_name=self.channel_name,
            session_key=session_key,
        )


    # ======================================================
    # DATABASE: TOUCH PRESENCE
    # ======================================================


    @database_sync_to_async
    def touch_current_presence(
        self,
    ):

        return touch_presence(
            channel_name=self.channel_name,
        )


    # ======================================================
    # DATABASE: CLOSE PRESENCE
    # ======================================================


    @database_sync_to_async
    def close_presence_session(
        self,
    ):

        return disconnect_presence(
            channel_name=self.channel_name,
        )


    # ======================================================
    # DATABASE: SYNCHRONIZE PRESENCE
    # ======================================================


    @database_sync_to_async
    def synchronize_presence(
        self,
        *,
        participant_id,
    ):

        return synchronize_participant_presence(
            participant_id=participant_id,
        )


    # ======================================================
    # DATABASE: PARTICIPANT EVENT DATA
    # ======================================================


    @database_sync_to_async
    def get_participant_event_data(
        self,
    ):

        participant = getattr(
            self,
            "participant",
            None,
        )


        participant_id = getattr(
            participant,
            "pk",
            None,
        )


        if participant_id is None:

            raise ValueError(
                "ConnectX participant ID is missing."
            )


        participant = (
            MeetingParticipant.objects
            .select_related(
                "user",
            )
            .get(
                pk=participant_id,
            )
        )


        user = getattr(
            participant,
            "user",
            None,
        )


        user_id = getattr(
            user,
            "pk",
            None,
        )


        username = getattr(
            user,
            "username",
            "",
        )


        if user_id is None:

            raise ValueError(
                "ConnectX participant user ID is missing."
            )


        return {
            "participant_id": (
                participant_id
            ),
            "user_id": (
                user_id
            ),
            "username": (
                username
            ),
            "role": (
                participant.role
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
        }