/* ==========================================================
   CONNECTX WEBRTC

   Responsibility:
   - RTCPeerConnection lifecycle
   - Local track attachment
   - Remote MediaStream management
   - Remote video tiles
   - WebRTC offers
   - WebRTC answers
   - ICE candidate queue
   - Outgoing video track replacement
   - Peer cleanup

   This module does NOT:
   - Create signaling WebSocket
   - Create meeting WebSocket
   - Access camera or microphone devices
   - Perform host moderation
========================================================== */


// These functions will be moved to video_stage.js
// after the video stage implementation is complete.


import {

    attachRemoteStream,

    updateRemoteVideoVisibility,

    removeRemoteVideoTile,

} from "./video_stage.js";



import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    escapeHtml,
} from "./participants.js";


import {
    getAudioTrack,
    getVideoTrack,
    getScreenTrack,
} from "./media.js";

/* ==========================================================
   RTC CONFIGURATION
========================================================== */


const RTC_CONFIGURATION = {

    iceServers: [

        {

            urls: (
                "stun:stun.l.google.com:19302"
            ),

        },

        {

            urls: (
                "stun:stun1.l.google.com:19302"
            ),

        },

    ],

};


/* ==========================================================
   SIGNAL SENDER

   signaling.js registers its sender here.

   This prevents:
       webrtc.js -> signaling.js
       signaling.js -> webrtc.js

   circular module dependency.
========================================================== */


let signalSender = null;


/*
 * Prevent concurrent offer creation for the
 * same peer connection.
 */
const offerCreationInProgress = new Set();


/* ==========================================================
   REGISTER SIGNAL SENDER
========================================================== */


function registerSignalSender(
    sender
) {

    if (
        typeof sender !== "function"
    ) {

        throw new TypeError(
            "ConnectX WebRTC signal sender must be a function."
        );

    }


    signalSender = sender;


    console.log(
        "ConnectX WebRTC signal sender registered."
    );

}


/* ==========================================================
   SEND WEBRTC SIGNAL
========================================================== */


function sendWebRtcSignal(
    type,
    targetUserId,
    payload
) {

    if (!signalSender) {

        console.warn(
            "ConnectX WebRTC signal sender is unavailable."
        );


        return false;

    }


    return signalSender(

        type,

        targetUserId,

        payload

    );

}


/* ==========================================================
   GET PEER USERNAME
========================================================== */


function getPeerUsername(
    userId
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    const storedUsername = (

        context
            .peerUsernames
            .get(
                normalizedUserId
            )

    );


    if (storedUsername) {

        return storedUsername;

    }


    const participant = (

        context
            .elements
            .participantList
            ?.querySelector(

                `[data-participant-id="${normalizedUserId}"]`

            )

    );


    if (
        participant
        ?.dataset
        ?.participantUsername
    ) {

        return (
            participant
                .dataset
                .participantUsername
        );

    }


    return (
        `Participant ${normalizedUserId}`
    );

}


/* ==========================================================
   CREATE REMOTE VIDEO TILE
========================================================== */


function createRemoteVideoTile(
    userId,
    username
) {

    const context = getMeetingContext();


    const videoGrid = (
        context.elements.videoGrid
    );


    if (!videoGrid) {

        console.warn(
            "ConnectX video grid was not found."
        );


        return null;

    }


    const normalizedUserId = Number(
        userId
    );


    const existingTile = (

        videoGrid.querySelector(

            `[data-video-participant-id="${normalizedUserId}"]`

        )

    );


    if (existingTile) {

        return existingTile;

    }


    const resolvedUsername = (

        username

        ||

        getPeerUsername(
            normalizedUserId
        )

    );


    const safeUsername = (

        escapeHtml(
            resolvedUsername
        )

    );


    const firstLetter = (

        escapeHtml(

            resolvedUsername
                .charAt(0)
                .toUpperCase()

        )

    );


    const tile = (

        document.createElement(
            "article"
        )

    );


    tile.className = (
        "cx-meeting-video-tile"
    );


    tile.dataset.videoParticipantId = (
        String(
            normalizedUserId
        )
    );


    tile.innerHTML = `

        <video
            class="cx-meeting-local-video"
            data-remote-video
            autoplay
            playsinline>

        </video>


        <div
            class="cx-meeting-video-placeholder"
            data-remote-video-placeholder>

            <span>

                ${firstLetter}

            </span>

        </div>


        <div
            class="cx-meeting-video-meta">

            <span>

                ${safeUsername}

            </span>

            <small>

                Participant

            </small>

        </div>

    `;


    videoGrid.appendChild(
        tile
    );


    console.log(

        "ConnectX remote video tile created:",

        normalizedUserId

    );


    return tile;

}


/* ==========================================================
   BIND REMOTE TRACK VISIBILITY
========================================================== */


function bindRemoteTrackVisibility(
    userId,
    track
) {

    const updateVisibility = () => {

        updateRemoteVideoVisibility(
            userId
        );

    };


    track.addEventListener(
        "mute",
        updateVisibility
    );


    track.addEventListener(
        "unmute",
        updateVisibility
    );


    track.addEventListener(
        "ended",
        updateVisibility
    );

}



/* ==========================================================
   ADD REMOTE TRACK
========================================================== */


function addRemoteTrack(
    userId,
    username,
    track
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    let remoteStream = (

        context
            .remoteStreams
            .get(
                normalizedUserId
            )

    );


    if (!remoteStream) {

        remoteStream = (
            new MediaStream()
        );


        context.remoteStreams.set(

            normalizedUserId,

            remoteStream

        );

    }


    const existingTrack = (

        remoteStream
            .getTracks()
            .find(
                (currentTrack) => {

                    return (
                        currentTrack.id
                        ===
                        track.id
                    );

                }
            )

    );


    if (!existingTrack) {

        remoteStream.addTrack(
            track
        );


        bindRemoteTrackVisibility(
            normalizedUserId,
            track
        );

    }


    attachRemoteStream(

        normalizedUserId,

        username,

        remoteStream

    );

}


/* ==========================================================
   ENSURE VIDEO TRANSCEIVER
========================================================== */

function ensureVideoTransceiver(
    peerConnection
) {

    const videoTransceiver = (
        peerConnection
            .getTransceivers()
            .find(
                (transceiver) => {

                    return (
                        transceiver
                            .receiver
                            .track
                            ?.kind
                        ===
                        "video"
                    );

                }
            )
    );


    if (videoTransceiver) {

        if (
            videoTransceiver.direction
            ===
            "recvonly"
        ) {

            videoTransceiver.direction =
                "sendrecv";

        }

        return videoTransceiver;

    }


    /*
     * This should normally only happen for
     * defensive recovery.
     *
     * New peer connections create their
     * audio/video transceivers up front.
     */

    const newVideoTransceiver = (
        peerConnection.addTransceiver(
            "video",
            {
                direction: "sendrecv",
            }
        )
    );


    console.log(
        "ConnectX video transceiver created:",
        {
            mid: newVideoTransceiver.mid,
            direction: newVideoTransceiver.direction,
        }
    );


    return newVideoTransceiver;

}


/* ==========================================================
   INITIALIZE MEDIA TRANSCEIVERS
========================================================== */

function initializeMediaTransceivers(
    peerConnection
) {

    /*
     * IMPORTANT:
     *
     * Always create audio first and video second.
     *
     * This guarantees a stable m-line order:
     *
     *   m=audio
     *   m=video
     *
     * Track replacement must never create a new
     * media section during renegotiation.
     */

    const transceivers =
        peerConnection.getTransceivers();


    let audioTransceiver =
        transceivers.find(
            (transceiver) => {

                return (
                    transceiver
                        .receiver
                        .track
                        ?.kind
                    ===
                    "audio"
                );

            }
        );


    if (!audioTransceiver) {

        audioTransceiver =
            peerConnection.addTransceiver(
                "audio",
                {
                    direction: "sendrecv",
                }
            );

    } else if (
        audioTransceiver.direction
        ===
        "recvonly"
    ) {

        audioTransceiver.direction =
            "sendrecv";

    }


    let videoTransceiver =
        peerConnection.getTransceivers()
            .find(
                (transceiver) => {

                    return (
                        transceiver
                            .receiver
                            .track
                            ?.kind
                        ===
                        "video"
                    );

                }
            );


    if (!videoTransceiver) {

        videoTransceiver =
            peerConnection.addTransceiver(
                "video",
                {
                    direction: "sendrecv",
                }
            );

    } else if (
        videoTransceiver.direction
        ===
        "recvonly"
    ) {

        videoTransceiver.direction =
            "sendrecv";

    }


    console.log(
        "ConnectX media transceivers initialized:",
        {
            audioMid:
                audioTransceiver.mid,

            videoMid:
                videoTransceiver.mid,

            transceiverCount:
                peerConnection
                    .getTransceivers()
                    .length,
        }
    );


    return {
        audioTransceiver,
        videoTransceiver,
    };

}



/* ==========================================================
   ATTACH LOCAL TRACKS
========================================================== */

async function attachLocalTracks(
    peerConnection
) {

    const context =
        getMeetingContext();


    if (!context.localStream) {

        console.warn(
            "ConnectX local stream is unavailable."
        );

        return;

    }


    const {
        audioTransceiver,
        videoTransceiver,
    } = initializeMediaTransceivers(
        peerConnection
    );


    /* ======================================================
       AUDIO
    ====================================================== */

    const audioTracks = (
        context
            .localStream
            .getAudioTracks()
    );


    const audioTrack =
        audioTracks[0] || null;


    if (
        audioTrack
        &&
        audioTransceiver.sender.track?.id
        !==
        audioTrack.id
    ) {

        try {

            await audioTransceiver.sender.replaceTrack(
                audioTrack
            );

        } catch (error) {

            console.error(
                "ConnectX audio track replacement error:",
                error
            );

        }

    }


    /* ======================================================
       VIDEO
    ====================================================== */

    let videoTrack = null;


    if (
        context.isScreenSharing
        &&
        context.screenStream
    ) {

        videoTrack =
            getScreenTrack();

    }


    if (!videoTrack) {

        videoTrack =
            getVideoTrack();

    }


    if (
        videoTransceiver.sender.track?.id
        !==
        videoTrack?.id
    ) {

        try {

            await videoTransceiver.sender.replaceTrack(
                videoTrack || null
            );

        } catch (error) {

            console.error(
                "ConnectX video track replacement error:",
                error
            );

        }

    }


    console.log(
        "ConnectX local tracks attached:",
        {
            audioTracks:
                audioTracks.length,

            hasVideoTrack:
                Boolean(videoTrack),

            audioSenderTrack:
                audioTransceiver
                    .sender
                    .track
                    ?.id
                    || null,

            videoSenderTrack:
                videoTransceiver
                    .sender
                    .track
                    ?.id
                    || null,

            transceivers:
                peerConnection
                    .getTransceivers()
                    .length,
        }
    );

}


/* ==========================================================
   HANDLE ICE CANDIDATE
========================================================== */


function handleLocalIceCandidate(
    userId,
    event
) {

    if (!event.candidate) {

        return;

    }


    sendWebRtcSignal(

        "webrtc_ice_candidate",

        userId,

        event.candidate.toJSON()

    );

}


/* ==========================================================
   HANDLE REMOTE TRACK
========================================================== */


function handleRemoteTrack(
    userId,
    username,
    event
) {

    const tracks = [];


    if (
        event.streams
        &&
        event.streams[0]
    ) {

        event
            .streams[0]
            .getTracks()
            .forEach(
                (track) => {

                    tracks.push(
                        track
                    );

                }
            );

    } else {

        tracks.push(
            event.track
        );

    }


    tracks.forEach(
        (track) => {

            addRemoteTrack(

                userId,

                username,

                track

            );

        }
    );


        console.log(
            "=============================="
        );

        console.log(
            "REMOTE TRACK",
            {
                userId,
                username,
                trackKind: event.track.kind,
                trackId: event.track.id,
                streamCount: event.streams.length,
                streamTracks:
                    event.streams[0]
                        ?.getTracks()
                        .map(track => ({
                            kind: track.kind,
                            id: track.id,
                            enabled: track.enabled,
                            readyState: track.readyState,
                        })),
            }
        );

        console.log(
            "=============================="
        );

}


/* ==========================================================
   HANDLE CONNECTION STATE
========================================================== */


function handleConnectionStateChange(
    userId,
    peerConnection
) {

    console.log(

        "ConnectX WebRTC connection state:",

        {

            userId: userId,

            state: (
                peerConnection.connectionState
            ),

        }

    );


    switch (
        peerConnection.connectionState
    ) {

        case "disconnected":

            console.warn(
                "ConnectX WebRTC peer temporarily disconnected:",
                userId
            );

            break;


        case "failed":

            cleanupPeer(
                userId
            );

            break;


        case "closed":

            cleanupPeer(
                userId
            );

            break;


        default:

            break;
    }

}


/* ==========================================================
   HANDLE ICE CONNECTION STATE
========================================================== */


function handleIceConnectionStateChange(
    userId,
    peerConnection
) {

    console.log(

        "ConnectX WebRTC ICE state:",

        {

            userId: userId,

            state: (
                peerConnection.iceConnectionState
            ),

        }

    );

}


/* ==========================================================
   CREATE PEER CONNECTION
========================================================== */


function createPeerConnection(
    userId,
    username
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    if (

        normalizedUserId
        ===
        context.currentUserId

    ) {

        throw new Error(
            "ConnectX cannot create a peer connection to the current user."
        );

    }


    const existingPeerConnection = (

        context
            .peerConnections
            .get(
                normalizedUserId
            )

    );


    if (existingPeerConnection) {

        return existingPeerConnection;

    }


    const resolvedUsername = (

        username

        ||

        getPeerUsername(
            normalizedUserId
        )

    );


    context.peerUsernames.set(

        normalizedUserId,

        resolvedUsername

    );


    const peerConnection = (
        new RTCPeerConnection(
            RTC_CONFIGURATION
        )
    );

    context.peerConnections.set(

        normalizedUserId,

        peerConnection

    );


    


    console.log("========================================");
    console.log("CONNECTX RTP SENDERS");

    peerConnection.getSenders().forEach((sender, index) => {
        console.log(
    `Sender ${index + 1}`,
    "track =",
    sender.track,
    "kind =",
    sender.track?.kind,
    "id =",
    sender.track?.id,
    "readyState =",
    sender.track?.readyState
);
    });

    console.log("========================================");


    peerConnection.addEventListener(

        "icecandidate",

        (event) => {

            handleLocalIceCandidate(

                normalizedUserId,

                event

            );

        }

    );


    peerConnection.addEventListener(

        "track",

        (event) => {

            handleRemoteTrack(

                normalizedUserId,

                resolvedUsername,

                event

            );

        }

    );


    peerConnection.addEventListener(

        "connectionstatechange",

        () => {

            handleConnectionStateChange(

                normalizedUserId,

                peerConnection

            );

        }

    );


    peerConnection.addEventListener(

        "iceconnectionstatechange",

        () => {

            handleIceConnectionStateChange(

                normalizedUserId,

                peerConnection

            );

        }

    );


    console.log(

        "ConnectX peer connection created:",

        {

            userId: normalizedUserId,

            username: resolvedUsername,

        }

    );


    return peerConnection;

}


/* ==========================================================
   FLUSH PENDING ICE CANDIDATES
========================================================== */


async function flushPendingIceCandidates(
    userId,
    peerConnection
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    const candidates = (

        context
            .pendingIceCandidates
            .get(
                normalizedUserId
            )

        ||

        []

    );


    for (
        const candidate
        of candidates
    ) {

        try {

            await peerConnection.addIceCandidate(
                candidate
            );

        } catch (error) {

            console.error(

                "ConnectX pending ICE candidate error:",

                error

            );

        }

    }


    context.pendingIceCandidates.delete(
        normalizedUserId
    );

}


/* ==========================================================
   CREATE OFFER
========================================================== */


async function createOfferForPeer(
    userId,
    username
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    /*
    * Do not create two offers for the same
    * peer at the same time.
    */
    if (
        offerCreationInProgress.has(
            normalizedUserId
        )
    ) {

        console.log(
            "ConnectX offer creation already in progress:",
            normalizedUserId
        );

        return;

    }

    offerCreationInProgress.add(
        normalizedUserId
    );


    if (

        normalizedUserId
        ===
        context.currentUserId

    ) {

        return;

    }


    const peerConnection = (

        createPeerConnection(

            normalizedUserId,

            username

        )

    );

    await attachLocalTracks(
        peerConnection
    );


    if (

        peerConnection.signalingState
        !==
        "stable"

    ) {

        console.warn(

            "ConnectX peer is not ready for offer:",

            {

                userId: normalizedUserId,

                signalingState: (
                    peerConnection.signalingState
                ),

            }

        );


        return;

    }


        try {

        console.log("========================================");
        console.log("SENDERS BEFORE OFFER");


        console.log("========== TRANSCEIVERS ==========");

        peerConnection.getTransceivers().forEach((transceiver, index) => {
            console.log(`Transceiver ${index + 1}`, {
                mid: transceiver.mid,
                direction: transceiver.direction,
                currentDirection: transceiver.currentDirection,
                senderKind: transceiver.sender.track?.kind,
                senderHasTrack: !!transceiver.sender.track,
                receiverKind: transceiver.receiver.track?.kind,
            });
        });

        console.log("==================================");

        console.log({
            signalingState: peerConnection.signalingState,
            connectionState: peerConnection.connectionState,
            transceivers: peerConnection.getTransceivers().length,
        });

        peerConnection.getSenders().forEach((sender, index) => {
            console.log(`Sender ${index + 1}`, {
                kind: sender.track?.kind,
                id: sender.track?.id,
                enabled: sender.track?.enabled,
                readyState: sender.track?.readyState,
                hasTrack: sender.track !== null,
            });
        });

        console.log("========================================");

        const offer = (
            await peerConnection.createOffer()
        );


        await peerConnection.setLocalDescription(
            offer
        );


        console.log("========================================");
        console.log("CONNECTX OFFER SDP");
        console.log(peerConnection.localDescription.sdp);
        console.log("========================================");


        sendWebRtcSignal(

            "webrtc_offer",

            normalizedUserId,

            peerConnection
                .localDescription
                .toJSON()

        );


        console.log(

            "ConnectX WebRTC offer sent:",

            {

                userId: normalizedUserId,

                username: username,

            }

        );

    } catch (error) {

        console.error(

            "ConnectX WebRTC offer creation error:",

            error

        );

    } finally {

        offerCreationInProgress.delete(
            normalizedUserId
        );

    }

}


/* ==========================================================
   HANDLE REMOTE OFFER
========================================================== */


async function handleWebRtcOffer(
    data
) {

    const context = getMeetingContext();


    const senderUserId = Number(
        data.sender_user_id
    );


    if (

        senderUserId
        ===
        context.currentUserId

    ) {

        return;

    }


    context.peerUsernames.set(

        senderUserId,

        data.sender_username

    );


    const peerConnection = (

        createPeerConnection(

            senderUserId,

            data.sender_username

        )

    );


    try {

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                data.payload
            )
        );

        await attachLocalTracks(
            peerConnection
        );


        await flushPendingIceCandidates(
            senderUserId,
            peerConnection
        );

        console.log("========================================");
        console.log("SENDERS BEFORE ANSWER");

        console.log({
            signalingState: peerConnection.signalingState,
            connectionState: peerConnection.connectionState,
            transceivers: peerConnection.getTransceivers().length,
        });

        peerConnection.getSenders().forEach((sender, index) => {
            console.log(`Sender ${index + 1}`, {
                kind: sender.track?.kind,
                id: sender.track?.id,
                enabled: sender.track?.enabled,
                readyState: sender.track?.readyState,
                hasTrack: sender.track !== null,
            });
        });

        console.log("========================================");

        const answer = (
            await peerConnection.createAnswer()
        );

        await peerConnection.setLocalDescription(
            answer
        );


        console.log("========================================");
        console.log("CONNECTX ANSWER SDP");
        console.log(peerConnection.localDescription.sdp);
        console.log("========================================");



        sendWebRtcSignal(

            "webrtc_answer",

            senderUserId,

            peerConnection
                .localDescription
                .toJSON()

        );


        console.log(

            "ConnectX WebRTC answer sent:",

            {

                userId: senderUserId,

                username: data.sender_username,

            }

        );

    } catch (error) {

        console.error(

            "ConnectX WebRTC offer handling error:",

            error

        );

    }

}


/* ==========================================================
   HANDLE REMOTE ANSWER
========================================================== */


async function handleWebRtcAnswer(
    data
) {

    const context = getMeetingContext();


    const senderUserId = Number(
        data.sender_user_id
    );


    const peerConnection = (

        context
            .peerConnections
            .get(
                senderUserId
            )

    );


    if (!peerConnection) {

        console.warn(

            "ConnectX peer connection missing for answer:",

            senderUserId

        );


        return;

    }


    try {

        await peerConnection.setRemoteDescription(

            new RTCSessionDescription(
                data.payload
            )

        );


        await flushPendingIceCandidates(

            senderUserId,

            peerConnection

        );


        console.log(

            "ConnectX WebRTC answer applied:",

            {

                userId: senderUserId,

                username: data.sender_username,

            }

        );

    } catch (error) {

        console.error(

            "ConnectX WebRTC answer handling error:",

            error

        );

    }

}


/* ==========================================================
   HANDLE REMOTE ICE CANDIDATE
========================================================== */


async function handleWebRtcIceCandidate(
    data
) {

    const context = getMeetingContext();


    const senderUserId = Number(
        data.sender_user_id
    );


    let candidate;


    try {

        candidate = (

            new RTCIceCandidate(
                data.payload
            )

        );

    } catch (error) {

        console.error(

            "ConnectX invalid ICE candidate:",

            error

        );


        return;

    }


    const peerConnection = (

        context
            .peerConnections
            .get(
                senderUserId
            )

    );


    if (

        !peerConnection

        ||

        !peerConnection.remoteDescription

    ) {

        const pendingCandidates = (

            context
                .pendingIceCandidates
                .get(
                    senderUserId
                )

            ||

            []

        );


        pendingCandidates.push(
            candidate
        );


        context.pendingIceCandidates.set(

            senderUserId,

            pendingCandidates

        );


        console.log(

            "ConnectX ICE candidate queued:",

            senderUserId

        );


        return;

    }


    try {

        await peerConnection.addIceCandidate(
            candidate
        );


        console.log(

            "ConnectX ICE candidate applied:",

            senderUserId

        );

    } catch (error) {

        console.error(

            "ConnectX ICE candidate error:",

            error

        );

    }

}


/* ==========================================================
   REPLACE OUTGOING VIDEO TRACK
========================================================== */


async function replaceOutgoingVideoTrack(
    newTrack
) {

    const context = getMeetingContext();


    const replacements = [];


    context
        .peerConnections
        .forEach(
            (
                peerConnection,
                userId
            ) => {

                const videoTransceiver = (

                    ensureVideoTransceiver(
                        peerConnection
                    )

                );


                replacements.push(

                    videoTransceiver
                        .sender
                        .replaceTrack(
                            newTrack
                            ||
                            null
                        )

                );


                console.log(

                    "ConnectX video sender replacement scheduled:",

                    {

                        userId: userId,

                        hasTrack: Boolean(
                            newTrack
                        ),

                    }

                );

            }
        );


    const results = (

        await Promise.allSettled(
            replacements
        )

    );


    results.forEach(
        (
            result,
            index
        ) => {

            if (
                result.status
                ===
                "rejected"
            ) {

                console.error(

                    "ConnectX outgoing video track replacement error:",

                    {

                        index: index,

                        error: (
                            result.reason
                        ),

                    }

                );

            }

        }
    );


    console.log(

        "ConnectX outgoing video track replaced:",

        {

            peerCount: (
                context
                    .peerConnections
                    .size
            ),

            hasTrack: Boolean(
                newTrack
            ),

        }

    );

}


/* ==========================================================
   CLEANUP PEER
========================================================== */

function cleanupPeer(userId) {

    const context = getMeetingContext();

    const normalizedUserId = Number(userId);

    const peerConnection = context.peerConnections.get(
        normalizedUserId
    );

    if (!peerConnection) {
        return;
    }

    try {

        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.oniceconnectionstatechange = null;

        peerConnection.getSenders().forEach((sender) => {

            try {
                sender.replaceTrack(null);
            } catch (error) {}

        });

        peerConnection.close();

    } catch (error) {

        console.warn(
            "ConnectX peer cleanup warning:",
            error
        );

    }

    context.peerConnections.delete(
        normalizedUserId
    );

    offerCreationInProgress.delete(
        normalizedUserId
    );

    context.pendingIceCandidates.delete(
        normalizedUserId
    );

    removeRemoteVideoTile(
        normalizedUserId
    );

    console.log(
        "ConnectX peer cleaned:",
        normalizedUserId
    );

}



/* ==========================================================
   CLEANUP ALL PEERS
========================================================== */

function cleanupAllPeers() {

    const context = getMeetingContext();

    const peerIds = Array.from(
        context.peerConnections.keys()
    );

    peerIds.forEach((userId) => {

        cleanupPeer(userId);

    });

    context.peerConnections.clear();
    context.remoteStreams.clear();
    context.pendingIceCandidates.clear();
    context.peerUsernames.clear();

    console.log(
        "ConnectX all peer connections cleaned."
    );

}




/* ==========================================================
   EXPORTS
========================================================== */


export {

    registerSignalSender,

    createPeerConnection,

    createOfferForPeer,

    handleWebRtcOffer,

    handleWebRtcAnswer,

    handleWebRtcIceCandidate,

    replaceOutgoingVideoTrack,

    cleanupPeer,

    cleanupAllPeers,

};