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


import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    escapeHtml,
} from "./participants.js";


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
   UPDATE REMOTE VIDEO VISIBILITY
========================================================== */


function updateRemoteVideoVisibility(
    userId
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    const stream = (

        context
            .remoteStreams
            .get(
                normalizedUserId
            )

    );


    const tile = (

        context
            .elements
            .videoGrid
            ?.querySelector(

                `[data-video-participant-id="${normalizedUserId}"]`

            )

    );


    if (
        !stream
        ||
        !tile
    ) {

        return;

    }


    const remoteVideo = (

        tile.querySelector(
            "[data-remote-video]"
        )

    );


    const placeholder = (

        tile.querySelector(
            "[data-remote-video-placeholder]"
        )

    );


    if (!remoteVideo) {

        return;

    }


    const videoTrack = (

        stream
            .getVideoTracks()[0]

        ||

        null

    );


    const hasLiveVideo = (

        Boolean(
            videoTrack
        )

        &&

        videoTrack.readyState === "live"

        &&

        !videoTrack.muted

    );


    remoteVideo.hidden = (
        !hasLiveVideo
    );


    if (placeholder) {

        placeholder.classList.toggle(

            "cx-meeting-video-placeholder--hidden",

            hasLiveVideo

        );

    }

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
   ATTACH REMOTE STREAM
========================================================== */


function attachRemoteStream(
    userId,
    username,
    stream
) {

    const tile = (

        createRemoteVideoTile(
            userId,
            username
        )

    );


    if (!tile) {

        return;

    }


    const remoteVideo = (

        tile.querySelector(
            "[data-remote-video]"
        )

    );


    if (!remoteVideo) {

        return;

    }


    if (
        remoteVideo.srcObject !== stream
    ) {

        remoteVideo.srcObject = (
            stream
        );

    }


    updateRemoteVideoVisibility(
        userId
    );


    remoteVideo
        .play()
        .catch(
            (error) => {

                console.warn(

                    "ConnectX remote media autoplay blocked:",

                    error

                );

            }
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

    const existingVideoTransceiver = (

        peerConnection
            .getTransceivers()
            .find(
                (transceiver) => {

                    return (

                        transceiver
                            .receiver
                            .track
                            .kind
                        ===
                        "video"

                    );

                }
            )

    );


    if (existingVideoTransceiver) {

        return existingVideoTransceiver;

    }


    const videoTransceiver = (

        peerConnection.addTransceiver(

            "video",

            {

                direction: "sendrecv",

            }

        )

    );


    console.log(
        "ConnectX video transceiver created."
    );


    return videoTransceiver;

}


/* ==========================================================
   ATTACH LOCAL TRACKS
========================================================== */


function attachLocalTracks(
    peerConnection
) {

    const context = getMeetingContext();


    const videoTransceiver = (

        ensureVideoTransceiver(
            peerConnection
        )

    );


    if (!context.localStream) {

        console.warn(
            "ConnectX local stream is unavailable."
        );


        return;

    }


    const audioTracks = (

        context
            .localStream
            .getAudioTracks()

    );


    const videoTrack = (

        context
            .localStream
            .getVideoTracks()[0]

        ||

        null

    );


    audioTracks.forEach(
        (track) => {

            const senderExists = (

                peerConnection
                    .getSenders()
                    .some(
                        (sender) => {

                            return (

                                sender.track
                                ?.id
                                ===
                                track.id

                            );

                        }
                    )

            );


            if (senderExists) {

                return;

            }


            peerConnection.addTrack(

                track,

                context.localStream

            );

        }
    );


    if (videoTrack) {

        videoTransceiver
            .sender
            .replaceTrack(
                videoTrack
            )
            .catch(
                (error) => {

                    console.error(

                        "ConnectX initial video track attachment error:",

                        error

                    );

                }
            );

    }


    console.log(

        "ConnectX local tracks attached:",

        {

            audioTracks: (
                audioTracks.length
            ),

            hasVideoTrack: Boolean(
                videoTrack
            ),

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

        "ConnectX remote track received:",

        {

            userId: userId,

            username: username,

            kind: event.track.kind,

        }

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


    attachLocalTracks(
        peerConnection
    );


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

        const offer = (

            await peerConnection.createOffer()

        );


        await peerConnection.setLocalDescription(
            offer
        );


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


        await flushPendingIceCandidates(

            senderUserId,

            peerConnection

        );


        const answer = (

            await peerConnection.createAnswer()

        );


        await peerConnection.setLocalDescription(
            answer
        );


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
   REMOVE REMOTE VIDEO TILE
========================================================== */


function removeRemoteVideoTile(
    userId
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    const tile = (

        context
            .elements
            .videoGrid
            ?.querySelector(

                `[data-video-participant-id="${normalizedUserId}"]`

            )

    );


    if (!tile) {

        return;

    }


    const remoteVideo = (

        tile.querySelector(
            "[data-remote-video]"
        )

    );


    if (remoteVideo) {

        remoteVideo.pause();


        remoteVideo.srcObject = null;

    }


    tile.remove();


    console.log(

        "ConnectX remote video tile removed:",

        normalizedUserId

    );

}


/* ==========================================================
   CLEANUP PEER
========================================================== */


function cleanupPeer(
    userId
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    const peerConnection = (

        context
            .peerConnections
            .get(
                normalizedUserId
            )

    );


    if (peerConnection) {

        context.peerConnections.delete(
            normalizedUserId
        );


        try {

            peerConnection.close();

        } catch (error) {

            console.warn(

                "ConnectX peer close error:",

                error

            );

        }

    }


    const remoteStream = (

        context
            .remoteStreams
            .get(
                normalizedUserId
            )

    );


    if (remoteStream) {

        remoteStream
            .getTracks()
            .forEach(
                (track) => {

                    track.stop();

                }
            );


        context.remoteStreams.delete(
            normalizedUserId
        );

    }


    context.pendingIceCandidates.delete(
        normalizedUserId
    );


    context.peerUsernames.delete(
        normalizedUserId
    );


    removeRemoteVideoTile(
        normalizedUserId
    );


    console.log(

        "ConnectX WebRTC peer cleaned:",

        normalizedUserId

    );

}


/* ==========================================================
   CLEANUP ALL PEERS
========================================================== */


function cleanupAllPeers() {

    const context = getMeetingContext();


    const peerIds = (

        Array.from(
            context
                .peerConnections
                .keys()
        )

    );


    peerIds.forEach(
        (userId) => {

            cleanupPeer(
                userId
            );

        }
    );


    context.pendingIceCandidates.clear();


    console.log(
        "ConnectX all WebRTC peers cleaned."
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