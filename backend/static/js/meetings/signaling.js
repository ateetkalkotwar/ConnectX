/* ==========================================================
   CONNECTX SIGNALING

   Responsibility:
   - Signaling WebSocket connection
   - Register WebRTC signal sender
   - Peer ready events
   - Peer left events
   - Route WebRTC offers
   - Route WebRTC answers
   - Route ICE candidates
   - Ping / pong
   - Signaling reconnect lifecycle

   This module does NOT:
   - Create RTCPeerConnection directly
   - Access camera or microphone
   - Manage participant UI
   - Handle meeting state WebSocket events
========================================================== */


import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    registerSignalSender,
    createOfferForPeer,
    handleWebRtcOffer,
    handleWebRtcAnswer,
    handleWebRtcIceCandidate,
    cleanupPeer,
} from "./webrtc.js";


/* ==========================================================
   SIGNALING CONFIGURATION
========================================================== */


const SIGNALING_RECONNECT_DELAY = 2000;

const SIGNALING_MAX_RECONNECT_ATTEMPTS = 5;

const SIGNALING_PING_INTERVAL = 25000;


/* ==========================================================
   SIGNALING RUNTIME
========================================================== */


let reconnectAttempts = 0;

let reconnectTimer = null;

let pingTimer = null;

let intentionalClose = false;


/* ==========================================================
   BUILD SIGNALING WEBSOCKET URL
========================================================== */


function getSignalingWebSocketUrl() {

    const context = getMeetingContext();


    const protocol = (

        window.location.protocol === "https:"

            ? "wss"

            : "ws"

    );


    return (

        `${protocol}://`

        +

        `${window.location.host}`

        +

        `/ws/signaling/meetings/${context.meetingCode}/`

    );

}


/* ==========================================================
   CLEAR RECONNECT TIMER
========================================================== */


function clearReconnectTimer() {

    if (!reconnectTimer) {

        return;

    }


    window.clearTimeout(
        reconnectTimer
    );


    reconnectTimer = null;

}


/* ==========================================================
   CLEAR PING TIMER
========================================================== */


function clearPingTimer() {

    if (!pingTimer) {

        return;

    }


    window.clearInterval(
        pingTimer
    );


    pingTimer = null;

}


/* ==========================================================
   SEND RAW SIGNALING MESSAGE
========================================================== */


function sendSignalingMessage(
    data
) {

    const context = getMeetingContext();


    const socket = (
        context.signalingSocket
    );


    if (

        !socket

        ||

        socket.readyState !== WebSocket.OPEN

    ) {

        console.warn(
            "ConnectX signaling socket is not ready."
        );


        return false;

    }


    socket.send(

        JSON.stringify(
            data
        )

    );


    return true;

}


/* ==========================================================
   SEND WEBRTC SIGNAL
========================================================== */


function sendWebRtcSignal(
    type,
    targetUserId,
    payload
) {

    const context = getMeetingContext();


    const normalizedTargetUserId = Number(
        targetUserId
    );


    const allowedSignalTypes = new Set([

        "webrtc_offer",

        "webrtc_answer",

        "webrtc_ice_candidate",

    ]);


    if (
        !allowedSignalTypes.has(
            type
        )
    ) {

        console.error(

            "ConnectX invalid WebRTC signal type:",

            type

        );


        return false;

    }


    if (

        !Number.isInteger(
            normalizedTargetUserId
        )

        ||

        normalizedTargetUserId <= 0

    ) {

        console.error(

            "ConnectX invalid signaling target user ID:",

            targetUserId

        );


        return false;

    }


    if (

        normalizedTargetUserId
        ===
        context.currentUserId

    ) {

        console.warn(
            "ConnectX cannot signal the current user."
        );


        return false;

    }


    if (
        payload === undefined
        ||
        payload === null
    ) {

        console.error(
            "ConnectX signaling payload is missing."
        );


        return false;

    }


    return sendSignalingMessage({

        type: type,

        target_user_id: (
            normalizedTargetUserId
        ),

        payload: payload,

    });

}


/* ==========================================================
   START SIGNALING PING
========================================================== */


function startSignalingPing() {

    clearPingTimer();


    pingTimer = window.setInterval(

        () => {

            sendSignalingMessage({

                type: "ping",

            });

        },

        SIGNALING_PING_INTERVAL

    );

}


/* ==========================================================
   SHOULD CURRENT USER CREATE OFFER
========================================================== */


function shouldCreateOfferForPeer(
    peerUserId
) {

    const context = getMeetingContext();


    const normalizedPeerUserId = Number(
        peerUserId
    );


    /*
     * Deterministic offer ownership.
     *
     * Only the user with the smaller user ID
     * creates the initial offer.
     *
     * This avoids both browsers creating
     * offers simultaneously.
     */


    return (

        context.currentUserId

        <

        normalizedPeerUserId

    );

}


/* ==========================================================
   HANDLE SIGNALING PEER READY
========================================================== */


async function handleSignalingPeerReady(
    data
) {

    const context = getMeetingContext();


    const peerUserId = Number(
        data.user_id
    );


    if (

        !Number.isInteger(
            peerUserId
        )

        ||

        peerUserId <= 0

    ) {

        console.warn(

            "ConnectX invalid signaling peer:",

            data

        );


        return;

    }


    if (

        peerUserId
        ===
        context.currentUserId

    ) {

        console.log(
            "ConnectX current signaling peer ready."
        );


        return;

    }


    context.peerUsernames.set(

        peerUserId,

        data.username
        ||
        `Participant ${peerUserId}`

    );


    console.log(

        "ConnectX signaling peer ready:",

        {

            userId: peerUserId,

            username: data.username,

        }

    );


    if (

        !shouldCreateOfferForPeer(
            peerUserId
        )

    ) {

        console.log(

            "ConnectX waiting for peer offer:",

            peerUserId

        );


        return;

    }


    await createOfferForPeer(

        peerUserId,

        data.username

    );

}


/* ==========================================================
   HANDLE SIGNALING PEER LEFT
========================================================== */


function handleSignalingPeerLeft(
    data
) {

    const context = getMeetingContext();


    const peerUserId = Number(
        data.user_id
    );


    if (

        !Number.isInteger(
            peerUserId
        )

        ||

        peerUserId <= 0

    ) {

        return;

    }


    if (

        peerUserId
        ===
        context.currentUserId

    ) {

        return;

    }


    cleanupPeer(
        peerUserId
    );


    console.log(

        "ConnectX signaling peer left:",

        {

            userId: peerUserId,

            username: data.username,

        }

    );

}


/* ==========================================================
   HANDLE SIGNALING MESSAGE
========================================================== */


async function handleSignalingMessage(
    event
) {

    let data;


    try {

        data = JSON.parse(
            event.data
        );

    } catch (error) {

        console.error(

            "ConnectX invalid signaling JSON:",

            error

        );


        return;

    }


    console.log(

        "ConnectX signaling message:",

        data

    );


    switch (
        data.type
    ) {

        case "signaling_peer_ready":

            await handleSignalingPeerReady(
                data
            );

            break;


        case "signaling_peer_left":

            handleSignalingPeerLeft(
                data
            );

            break;


        case "webrtc_offer":

            await handleWebRtcOffer(
                data
            );

            break;


        case "webrtc_answer":

            await handleWebRtcAnswer(
                data
            );

            break;


        case "webrtc_ice_candidate":

            await handleWebRtcIceCandidate(
                data
            );

            break;


        case "pong":

            console.log(
                "ConnectX signaling pong received."
            );

            break;


        case "error":

            console.error(

                "ConnectX signaling server error:",

                data.message

            );

            break;


        default:

            console.warn(

                "ConnectX unsupported signaling event:",

                data.type

            );

    }

}


/* ==========================================================
   SCHEDULE SIGNALING RECONNECT
========================================================== */


function scheduleSignalingReconnect() {

    if (intentionalClose) {

        return;

    }


    if (

        reconnectAttempts

        >=

        SIGNALING_MAX_RECONNECT_ATTEMPTS

    ) {

        console.error(
            "ConnectX signaling reconnect limit reached."
        );


        return;

    }


    clearReconnectTimer();


    reconnectAttempts += 1;


    const delay = (

        SIGNALING_RECONNECT_DELAY

        *

        reconnectAttempts

    );


    console.log(

        "ConnectX signaling reconnect scheduled:",

        {

            attempt: reconnectAttempts,

            delay: delay,

        }

    );


    reconnectTimer = window.setTimeout(

        () => {

            connectSignalingSocket();

        },

        delay

    );

}


/* ==========================================================
   CONNECT SIGNALING SOCKET
========================================================== */


function connectSignalingSocket() {

    const context = getMeetingContext();


    const existingSocket = (
        context.signalingSocket
    );


    if (

        existingSocket

        &&

        (

            existingSocket.readyState
            === WebSocket.OPEN

            ||

            existingSocket.readyState
            === WebSocket.CONNECTING

        )

    ) {

        return existingSocket;

    }


    intentionalClose = false;


    clearReconnectTimer();


    const socket = (

        new WebSocket(
            getSignalingWebSocketUrl()
        )

    );


    context.signalingSocket = (
        socket
    );


    socket.addEventListener(

        "open",

        () => {

            reconnectAttempts = 0;


            console.log(
                "ConnectX signaling WebSocket connected."
            );


            sendSignalingMessage({

                type: "ping",

            });


            startSignalingPing();

        }

    );


    socket.addEventListener(

        "message",

        (event) => {

            handleSignalingMessage(
                event
            ).catch(
                (error) => {

                    console.error(

                        "ConnectX signaling message handler error:",

                        error

                    );

                }
            );

        }

    );


    socket.addEventListener(

        "close",

        (event) => {

            clearPingTimer();


            if (

                context.signalingSocket
                ===
                socket

            ) {

                context.signalingSocket = null;

            }


            console.log(

                "ConnectX signaling WebSocket closed:",

                event.code

            );


            scheduleSignalingReconnect();

        }

    );


    socket.addEventListener(

        "error",

        (error) => {

            console.error(

                "ConnectX signaling WebSocket transport error:",

                error

            );

        }

    );


    return socket;

}


/* ==========================================================
   CLOSE SIGNALING SOCKET
========================================================== */


function closeSignalingSocket() {

    const context = getMeetingContext();


    intentionalClose = true;


    clearReconnectTimer();

    clearPingTimer();


    reconnectAttempts = 0;


    const socket = (
        context.signalingSocket
    );


    context.signalingSocket = null;


    if (

        socket

        &&

        (

            socket.readyState
            === WebSocket.OPEN

            ||

            socket.readyState
            === WebSocket.CONNECTING

        )

    ) {

        socket.close(
            1000,
            "Meeting room closed."
        );

    }


    console.log(
        "ConnectX signaling socket closed intentionally."
    );

}


/* ==========================================================
   REGISTER SIGNAL TRANSPORT
========================================================== */


registerSignalSender(
    sendWebRtcSignal
);


/* ==========================================================
   EXPORTS
========================================================== */


export {

    getSignalingWebSocketUrl,

    sendSignalingMessage,

    sendWebRtcSignal,

    connectSignalingSocket,

    closeSignalingSocket,

};