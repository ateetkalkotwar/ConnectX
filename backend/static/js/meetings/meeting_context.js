/* ==========================================================
   CONNECTX MEETING CONTEXT

   Responsibility:
   - Meeting configuration
   - Shared runtime state
   - Shared DOM references
   - WebRTC runtime collections

   This module does NOT:
   - Access camera or microphone
   - Create WebSockets
   - Create RTCPeerConnection
   - Update participant UI
   - Perform moderation
========================================================== */


const meetingContext = {

    initialized: false,


    /* ======================================================
       MEETING IDENTITY
    ====================================================== */

    meetingRoom: null,

    meetingCode: null,

    currentUserId: null,

    currentUsername: null,


    /* ======================================================
       MEETING PERMISSIONS
    ====================================================== */

    isHost: false,

    hostModerationEnabled: false,


    /* ======================================================
       BACKEND ENDPOINTS
    ====================================================== */

    stateUrl: null,


    /* ======================================================
       PARTICIPANT STATE
    ====================================================== */

    isMuted: false,

    isVideoEnabled: true,

    isScreenSharing: false,

    forcedMuted: false,

    forcedVideoDisabled: false,


    /* ======================================================
       LOCAL MEDIA
    ====================================================== */

    localStream: null,

    screenStream: null,


    /* ======================================================
       WEBSOCKETS
    ====================================================== */

    meetingSocket: null,

    signalingSocket: null,


    /* ======================================================
       WEBRTC STATE
    ====================================================== */

    peerConnections: new Map(),

    remoteStreams: new Map(),

    pendingIceCandidates: new Map(),

    peerUsernames: new Map(),


    /* ======================================================
       DOM REFERENCES
    ====================================================== */

    elements: {

        participantCount: null,

        participantList: null,

        participantPanel: null,

        peopleControlCount: null,

        activityToasts: null,

        videoGrid: null,

        microphoneButton: null,

        cameraButton: null,

        shareButton: null,

        peopleButton: null,

        localVideo: null,

        videoPlaceholder: null,

    },

};


/* ==========================================================
   INITIALIZE MEETING CONTEXT
========================================================== */


function initializeMeetingContext() {

    if (meetingContext.initialized) {

        return meetingContext;

    }


    const meetingRoom = (
        document.querySelector(
            ".cx-meeting-room"
        )
    );


    if (!meetingRoom) {

        throw new Error(
            "ConnectX meeting room element was not found."
        );

    }


    /* ======================================================
       MEETING IDENTITY
    ====================================================== */


    const meetingCode = (
        meetingRoom.dataset.meetingCode
    );


    const currentUserId = Number(
        meetingRoom.dataset.currentUserId
    );


    const currentUsername = (
        meetingRoom.dataset.currentUsername
    );


    if (!meetingCode) {

        throw new Error(
            "ConnectX meeting code is missing."
        );

    }


    if (
        !Number.isInteger(
            currentUserId
        )
        ||
        currentUserId <= 0
    ) {

        throw new Error(
            "ConnectX current user ID is invalid."
        );

    }


    if (!currentUsername) {

        throw new Error(
            "ConnectX current username is missing."
        );

    }


    meetingContext.meetingRoom = (
        meetingRoom
    );


    meetingContext.meetingCode = (
        meetingCode
    );


    meetingContext.currentUserId = (
        currentUserId
    );


    meetingContext.currentUsername = (
        currentUsername
    );


    /* ======================================================
       PERMISSIONS
    ====================================================== */


    meetingContext.isHost = (
        meetingRoom.dataset.isHost
        === "true"
    );


    meetingContext.hostModerationEnabled = (
        meetingRoom
            .dataset
            .hostModerationEnabled
        === "true"
    );


    /* ======================================================
       BACKEND ENDPOINTS
    ====================================================== */


    meetingContext.stateUrl = (
        meetingRoom.dataset.stateUrl
    );


    if (!meetingContext.stateUrl) {

        throw new Error(
            "ConnectX participant state URL is missing."
        );

    }


    /* ======================================================
       PARTICIPANT STATE
    ====================================================== */


    meetingContext.isMuted = (
        meetingRoom.dataset.isMuted
        === "true"
    );


    meetingContext.isVideoEnabled = (
        meetingRoom.dataset.isVideoEnabled
        === "true"
    );


    meetingContext.isScreenSharing = (
        meetingRoom.dataset.isScreenSharing
        === "true"
    );


    meetingContext.forcedMuted = (
        meetingRoom.dataset.forcedMuted
        === "true"
    );


    meetingContext.forcedVideoDisabled = (
        meetingRoom
            .dataset
            .forcedVideoDisabled
        === "true"
    );


    /* ======================================================
       DOM REFERENCES
    ====================================================== */


    meetingContext.elements.participantCount = (
        document.querySelector(
            "[data-participant-count]"
        )
    );


    meetingContext.elements.participantList = (
        document.querySelector(
            "[data-participant-list]"
        )
    );


    meetingContext.elements.participantPanel = (
        document.querySelector(
            "[data-participant-panel]"
        )
    );


    meetingContext.elements.peopleControlCount = (
        document.querySelector(
            "[data-people-control-count]"
        )
    );


    meetingContext.elements.activityToasts = (
        document.querySelector(
            "[data-activity-toasts]"
        )
    );


    meetingContext.elements.videoGrid = (
        document.querySelector(
            "[data-video-grid]"
        )
    );


    meetingContext.elements.microphoneButton = (
        document.querySelector(
            '[data-meeting-control="mute"]'
        )
    );


    meetingContext.elements.cameraButton = (
        document.querySelector(
            '[data-meeting-control="camera"]'
        )
    );


    meetingContext.elements.shareButton = (
        document.querySelector(
            '[data-meeting-control="share"]'
        )
    );


    meetingContext.elements.peopleButton = (
        document.querySelector(
            '[data-meeting-control="people"]'
        )
    );


    meetingContext.elements.localVideo = (
        document.querySelector(
            "[data-local-video]"
        )
    );


    meetingContext.elements.videoPlaceholder = (
        document.querySelector(
            "[data-video-placeholder]"
        )
    );


    /* ======================================================
       INITIALIZATION COMPLETE
    ====================================================== */


    meetingContext.initialized = true;


    console.log(
        "ConnectX meeting context initialized:",
        {
            meetingCode: (
                meetingContext.meetingCode
            ),

            currentUserId: (
                meetingContext.currentUserId
            ),

            currentUsername: (
                meetingContext.currentUsername
            ),

            isHost: (
                meetingContext.isHost
            ),

            hostModerationEnabled: (
                meetingContext
                    .hostModerationEnabled
            ),
        }
    );


    return meetingContext;

}


/* ==========================================================
   GET MEETING CONTEXT
========================================================== */


function getMeetingContext() {

    if (!meetingContext.initialized) {

        throw new Error(
            "ConnectX meeting context has not been initialized."
        );

    }


    return meetingContext;

}


/* ==========================================================
   RESET WEBRTC RUNTIME STATE
========================================================== */


function resetWebRtcRuntimeState() {

    meetingContext.peerConnections.clear();

    meetingContext.remoteStreams.clear();

    meetingContext.pendingIceCandidates.clear();

    meetingContext.peerUsernames.clear();

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    meetingContext,

    initializeMeetingContext,

    getMeetingContext,

    resetWebRtcRuntimeState,

};