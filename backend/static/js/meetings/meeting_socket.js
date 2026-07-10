/* ==========================================================
   CONNECTX MEETING SOCKET

   Responsibility:
   - Meeting WebSocket lifecycle
   - Participant join events
   - Participant leave events
   - Participant state events
   - Participant moderation events
   - Participant removal events
   - Meeting socket heartbeat

   Identity contract:

   participant_id
       =
   MeetingParticipant.id

   user_id
       =
   User.id

   This module does NOT:
   - Create WebRTC peers
   - Handle signaling
   - Access media devices
   - Send moderation HTTP requests
========================================================== */


import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    addParticipant,
    removeParticipant,
    updateParticipantStateUI,
    showActivityToast,
} from "./participants.js";


import {
    synchronizeLocalControlState,
} from "./controls.js";


/* ==========================================================
   SOCKET RUNTIME
========================================================== */


let meetingSocket = null;

let heartbeatInterval = null;

let reconnectTimeout = null;

let reconnectAttempts = 0;

let socketManuallyClosed = false;


const HEARTBEAT_INTERVAL = 30000;

const MAX_RECONNECT_DELAY = 10000;


/* ==========================================================
   BUILD SOCKET URL
========================================================== */


function buildMeetingSocketUrl() {

    const context = getMeetingContext();


    const protocol = (

        window.location.protocol === "https:"

            ? "wss"

            : "ws"

    );


    return (

        `${protocol}://${window.location.host}`

        +

        `/ws/meetings/${context.meetingCode}/`

    );

}


/* ==========================================================
   NORMALIZE PARTICIPANT EVENT
========================================================== */


function normalizeParticipantEvent(
    data
) {

    if (
        !data
        ||
        typeof data !== "object"
    ) {

        return null;

    }


    const participantId = Number(
        data.participant_id
        ??
        data.id
    );


    const userId = Number(
        data.user_id
    );


    if (

        !Number.isInteger(
            participantId
        )

        ||

        participantId <= 0

        ||

        !Number.isInteger(
            userId
        )

        ||

        userId <= 0

    ) {

        console.warn(

            "ConnectX invalid participant socket event:",

            data

        );


        return null;

    }


    return {

        id: participantId,

        participant_id: participantId,

        user_id: userId,

        username: String(

            data.username

            ||

            `Participant ${userId}`

        ),

        role: String(

            data.role

            ||

            "participant"

        ),

        moderation_url: (

            data.moderation_url

            ||

            null

        ),

        is_muted: Boolean(
            data.is_muted
        ),

        is_video_enabled: (

            data.is_video_enabled
            !==
            false

        ),

        is_screen_sharing: Boolean(
            data.is_screen_sharing
        ),

        forced_muted: Boolean(
            data.forced_muted
        ),

        forced_video_disabled: Boolean(
            data.forced_video_disabled
        ),

        action: (

            data.action

            ||

            null

        ),

    };

}


/* ==========================================================
   HANDLE PARTICIPANT JOINED
========================================================== */


function handleParticipantJoined(
    data
) {

    const participant = (

        normalizeParticipantEvent(
            data
        )

    );


    if (!participant) {

        return;

    }


    const context = getMeetingContext();


    addParticipant(
        participant
    );


    if (
        participant.user_id
        !==
        context.currentUserId
    ) {

        showActivityToast(

            `${participant.username} joined the meeting.`,

            "info"

        );

    }


    console.log(

        "ConnectX participant joined:",

        participant

    );

}


/* ==========================================================
   HANDLE PARTICIPANT LEFT
========================================================== */


function handleParticipantLeft(
    data
) {

    const participant = (

        normalizeParticipantEvent(
            data
        )

    );


    if (!participant) {

        return;

    }


    const context = getMeetingContext();


    removeParticipant(
        participant
    );


    if (
        participant.user_id
        !==
        context.currentUserId
    ) {

        showActivityToast(

            `${participant.username} left the meeting.`,

            "info"

        );

    }


    console.log(

        "ConnectX participant left:",

        participant

    );

}


/* ==========================================================
   HANDLE PARTICIPANT STATE CHANGED
========================================================== */


function handleParticipantStateChanged(
    data
) {

    const participant = (

        normalizeParticipantEvent(
            data
        )

    );


    if (!participant) {

        return;

    }


    const context = getMeetingContext();


    updateParticipantStateUI(
        participant
    );


    if (
        participant.user_id
        ===
        context.currentUserId
    ) {

        context.isMuted = (
            participant.is_muted
        );


        context.isVideoEnabled = (
            participant.is_video_enabled
        );


        context.isScreenSharing = (
            participant.is_screen_sharing
        );


        context.forcedMuted = (
            participant.forced_muted
        );


        context.forcedVideoDisabled = (
            participant
                .forced_video_disabled
        );


        synchronizeLocalControlState();

    }


    console.log(

        "ConnectX participant state changed:",

        participant

    );

}


/* ==========================================================
   HANDLE PARTICIPANT MODERATED
========================================================== */


function handleParticipantModerated(
    data
) {

    const participant = (

        normalizeParticipantEvent(
            data
        )

    );


    if (!participant) {

        return;

    }


    const context = getMeetingContext();


    updateParticipantStateUI(
        participant
    );


    if (
        participant.user_id
        ===
        context.currentUserId
    ) {

        context.isMuted = (
            participant.is_muted
        );


        context.isVideoEnabled = (
            participant.is_video_enabled
        );


        context.isScreenSharing = (
            participant.is_screen_sharing
        );


        context.forcedMuted = (
            participant.forced_muted
        );


        context.forcedVideoDisabled = (
            participant
                .forced_video_disabled
        );


        synchronizeLocalControlState();


        switch (
            participant.action
        ) {

            case "soft_mute":

                showActivityToast(

                    "The host muted your microphone.",

                    "warning"

                );

                break;


            case "force_mute":

                showActivityToast(

                    "The host restricted your microphone.",

                    "warning"

                );

                break;


            case "disable_camera":

                showActivityToast(

                    "The host turned off your camera.",

                    "warning"

                );

                break;


            case "restrict_camera":

                showActivityToast(

                    "The host restricted your camera.",

                    "warning"

                );

                break;


            default:

                break;

        }

    }


    console.log(

        "ConnectX participant moderated:",

        participant

    );

}


/* ==========================================================
   HANDLE PARTICIPANT REMOVED
========================================================== */


function handleParticipantRemoved(
    data
) {

    const participant = (

        normalizeParticipantEvent(
            data
        )

    );


    if (!participant) {

        return;

    }


    const context = getMeetingContext();


    removeParticipant(
        participant
    );


    if (
        participant.user_id
        ===
        context.currentUserId
    ) {

        socketManuallyClosed = true;


        showActivityToast(

            "The host removed you from the meeting.",

            "warning"

        );


        window.setTimeout(

            () => {

                window.location.href = "/meetings/";

            },

            1200

        );


        return;

    }


    showActivityToast(

        `${participant.username} was removed from the meeting.`,

        "info"

    );


    console.log(

        "ConnectX participant removed:",

        participant

    );

}


/* ==========================================================
   HANDLE SOCKET MESSAGE
========================================================== */


function handleMeetingSocketMessage(
    event
) {

    let data;


    try {

        data = JSON.parse(
            event.data
        );

    } catch (error) {

        console.error(

            "ConnectX invalid meeting socket JSON:",

            error

        );


        return;

    }


    console.log(

        "ConnectX meeting socket message:",

        data

    );


    switch (
        data.type
    ) {

        case "participant_joined":

            handleParticipantJoined(
                data
            );

            break;


        case "participant_left":

            handleParticipantLeft(
                data
            );

            break;


        case "participant_state_changed":

            handleParticipantStateChanged(
                data
            );

            break;


        case "participant_moderated":

            handleParticipantModerated(
                data
            );

            break;


        case "participant_removed":

            handleParticipantRemoved(
                data
            );

            break;


        case "pong":

            console.log(
                "ConnectX meeting socket pong received."
            );

            break;


        case "error":

            console.error(

                "ConnectX meeting socket server error:",

                data.message

            );


            showActivityToast(

                data.message
                ||
                "Meeting connection error.",

                "warning"

            );

            break;


        default:

            console.warn(

                "ConnectX unsupported meeting socket event:",

                data

            );

            break;

    }

}


/* ==========================================================
   START HEARTBEAT
========================================================== */


function startMeetingHeartbeat() {

    stopMeetingHeartbeat();


    heartbeatInterval = window.setInterval(

        () => {

            if (

                meetingSocket

                &&

                meetingSocket.readyState
                ===
                WebSocket.OPEN

            ) {

                meetingSocket.send(

                    JSON.stringify(
                        {
                            type: "ping",
                        }
                    )

                );

            }

        },

        HEARTBEAT_INTERVAL

    );

}


/* ==========================================================
   STOP HEARTBEAT
========================================================== */


function stopMeetingHeartbeat() {

    if (!heartbeatInterval) {

        return;

    }


    window.clearInterval(
        heartbeatInterval
    );


    heartbeatInterval = null;

}


/* ==========================================================
   CLEAR RECONNECT TIMER
========================================================== */


function clearReconnectTimer() {

    if (!reconnectTimeout) {

        return;

    }


    window.clearTimeout(
        reconnectTimeout
    );


    reconnectTimeout = null;

}


/* ==========================================================
   SCHEDULE RECONNECT
========================================================== */


function scheduleMeetingSocketReconnect() {

    if (socketManuallyClosed) {

        return;

    }


    clearReconnectTimer();


    reconnectAttempts += 1;


    const reconnectDelay = Math.min(

        1000
        *
        (
            2
            **
            (
                reconnectAttempts - 1
            )
        ),

        MAX_RECONNECT_DELAY

    );


    console.warn(

        "ConnectX scheduling meeting socket reconnect:",

        {
            attempt: reconnectAttempts,
            delay: reconnectDelay,
        }

    );


    reconnectTimeout = window.setTimeout(

        () => {

            connectMeetingSocket();

        },

        reconnectDelay

    );

}


/* ==========================================================
   CONNECT MEETING SOCKET
========================================================== */


function connectMeetingSocket() {

    if (

        meetingSocket

        &&

        (
            meetingSocket.readyState
            ===
            WebSocket.OPEN

            ||

            meetingSocket.readyState
            ===
            WebSocket.CONNECTING
        )

    ) {

        return meetingSocket;

    }


    socketManuallyClosed = false;


    clearReconnectTimer();


    const socketUrl = (

        buildMeetingSocketUrl()

    );


    meetingSocket = new WebSocket(
        socketUrl
    );


    meetingSocket.addEventListener(

        "open",

        () => {

            reconnectAttempts = 0;


            startMeetingHeartbeat();


            console.log(
                "ConnectX meeting WebSocket connected."
            );

        }

    );


    meetingSocket.addEventListener(

        "message",

        handleMeetingSocketMessage

    );


    meetingSocket.addEventListener(

        "error",

        (event) => {

            console.error(

                "ConnectX meeting WebSocket error:",

                event

            );

        }

    );


    meetingSocket.addEventListener(

        "close",

        (event) => {

            stopMeetingHeartbeat();


            meetingSocket = null;


            console.warn(

                "ConnectX meeting WebSocket closed:",

                event.code

            );


            if (!socketManuallyClosed) {

                scheduleMeetingSocketReconnect();

            }

        }

    );


    return meetingSocket;

}


/* ==========================================================
   DISCONNECT MEETING SOCKET
========================================================== */


function disconnectMeetingSocket() {

    socketManuallyClosed = true;


    stopMeetingHeartbeat();

    clearReconnectTimer();


    reconnectAttempts = 0;


    if (meetingSocket) {

        meetingSocket.close(
            1000,
            "ConnectX meeting client closed."
        );


        meetingSocket = null;

    }

}


/* ==========================================================
   GET MEETING SOCKET
========================================================== */


function getMeetingSocket() {

    return meetingSocket;

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    buildMeetingSocketUrl,

    normalizeParticipantEvent,

    connectMeetingSocket,

    disconnectMeetingSocket,

    getMeetingSocket,

};