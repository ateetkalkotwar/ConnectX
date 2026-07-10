/* ==========================================================
   CONNECTX MEETING ROOM
   Version: 1.2
========================================================== */


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const meetingRoom = document.querySelector(
            ".cx-meeting-room"
        );


        if (!meetingRoom) {

            return;

        }


        /* ==================================================
           ROOM DATA
        ================================================== */

        const meetingCode = (
            meetingRoom.dataset.meetingCode
        );


        const stateUrl = (
            meetingRoom.dataset.stateUrl
        );


        const currentUserId = Number(
            meetingRoom.dataset.currentUserId
        );


        const currentUsername = (
            meetingRoom.dataset.currentUsername
        );


        const isHost = (
            meetingRoom.dataset.isHost
            === "true"
        );


        const hostModerationEnabled = (
            meetingRoom
                .dataset
                .hostModerationEnabled
            === "true"
        );


        /* ==================================================
           PARTICIPANT ELEMENTS
        ================================================== */

        const participantCount = (
            document.querySelector(
                "[data-participant-count]"
            )
        );


        const participantList = (
            document.querySelector(
                "[data-participant-list]"
            )
        );


        const participantPanel = (
            document.querySelector(
                "[data-participant-panel]"
            )
        );


        const peopleControlCount = (
            document.querySelector(
                "[data-people-control-count]"
            )
        );


        const activityToasts = (
            document.querySelector(
                "[data-activity-toasts]"
            )
        );


        const videoGrid = (
            document.querySelector(
                "[data-video-grid]"
            )
        );


        /* ==================================================
           CONTROLS
        ================================================== */

        const muteButton = (
            document.querySelector(
                '[data-meeting-control="mute"]'
            )
        );


        const cameraButton = (
            document.querySelector(
                '[data-meeting-control="camera"]'
            )
        );


        const shareButton = (
            document.querySelector(
                '[data-meeting-control="share"]'
            )
        );


        const peopleButton = (
            document.querySelector(
                '[data-meeting-control="people"]'
            )
        );


        /* ==================================================
           LOCAL MEDIA ELEMENTS
        ================================================== */

        const localVideo = (
            document.querySelector(
                "[data-local-video]"
            )
        );


        const videoPlaceholder = (
            document.querySelector(
                "[data-video-placeholder]"
            )
        );


        /* ==================================================
           MEDIA STATE
        ================================================== */

        let localStream = null;

        let screenStream = null;


        let isMuted = (
            meetingRoom.dataset.isMuted
            === "true"
        );


        let isVideoEnabled = (
            meetingRoom
                .dataset
                .isVideoEnabled
            === "true"
        );


        let isScreenSharing = (
            meetingRoom
                .dataset
                .isScreenSharing
            === "true"
        );


        let forcedMuted = (
            meetingRoom.dataset.forcedMuted
            === "true"
        );


        let forcedVideoDisabled = (
            meetingRoom
                .dataset
                .forcedVideoDisabled
            === "true"
        );


        /* ==================================================
           PARTICIPANT COUNT
        ================================================== */

        function updateParticipantCount() {

            if (!participantList) {

                return;

            }


            const participants = (
                participantList.querySelectorAll(
                    "[data-participant-id]"
                )
            );


            const count = (
                participants.length
            );


            if (participantCount) {

                participantCount.textContent = (
                    String(
                        count
                    )
                );

            }


            if (peopleControlCount) {

                peopleControlCount.textContent = (
                    String(
                        count
                    )
                );

            }

        }


        /* ==================================================
           ACTIVITY TOASTS
        ================================================== */

        function showActivityToast(
            message,
            type = "info",
        ) {

            if (!activityToasts) {

                return;

            }


            const toast = (
                document.createElement(
                    "div"
                )
            );


            toast.className = (
                "cx-meeting-activity-toast"
            );


            toast.classList.add(
                `cx-meeting-activity-toast--${type}`
            );


            toast.textContent = (
                message
            );


            activityToasts.appendChild(
                toast
            );


            const visibleToasts = (
                activityToasts.querySelectorAll(
                    ".cx-meeting-activity-toast"
                )
            );


            if (
                visibleToasts.length > 3
            ) {

                visibleToasts[0].remove();

            }


            window.setTimeout(
                () => {

                    toast.classList.add(
                        "cx-meeting-activity-toast--leaving"
                    );


                    window.setTimeout(
                        () => {

                            toast.remove();

                        },
                        250,
                    );

                },
                3000,
            );

        }


        /* ==================================================
           PARTICIPANT UI
        ================================================== */

        function createParticipantElement(
            data
        ) {

            const participant = (
                document.createElement(
                    "article"
                )
            );


            participant.className = (
                "cx-meeting-room-participant"
            );


            participant.dataset.participantId = (
                String(
                    data.user_id
                )
            );


            if (data.participant_id) {

                participant.dataset
                    .participantRecordId = (
                        String(
                            data.participant_id
                        )
                    );


                participant.dataset.moderationUrl = (
                    `/meetings/${meetingCode}`
                    + "/participants/"
                    + `${data.participant_id}`
                    + "/moderate/"
                );

            }


            participant.dataset.participantUsername = (
                data.username
                || "Participant"
            );


            participant.dataset.participantMuted = (
                String(
                    Boolean(
                        data.is_muted
                    )
                )
            );


            participant.dataset
                .participantVideoEnabled = (
                    String(
                        data.is_video_enabled
                        !== false
                    )
                );


            participant.dataset
                .participantForcedMuted = (
                    String(
                        Boolean(
                            data.forced_muted
                        )
                    )
                );


            participant.dataset
                .participantForcedVideoDisabled = (
                    String(
                        Boolean(
                            data.forced_video_disabled
                        )
                    )
                );


            const username = (
                data.username
                || "Participant"
            );


            const firstLetter = (
                username
                    .charAt(0)
                    .toUpperCase()
            );


            const canModerate = (
                isHost
                && hostModerationEnabled
                && Number(
                    data.user_id
                ) !== currentUserId
                && Boolean(
                    data.participant_id
                )
            );


            const moderationMarkup = (
                canModerate
                    ? `
                        <div
                            class="cx-meeting-moderation"
                            data-moderation>

                            <button
                                type="button"
                                class="cx-meeting-moderation-trigger"
                                data-moderation-trigger
                                aria-label="Participant controls"
                                aria-expanded="false">

                                <span></span>
                                <span></span>
                                <span></span>

                            </button>

                            <div
                                class="cx-meeting-moderation-menu"
                                data-moderation-menu
                                hidden>

                                <button
                                    type="button"
                                    data-moderation-action="mute">
                                    Mute participant
                                </button>

                                <button
                                    type="button"
                                    data-moderation-action="turn_off_camera">
                                    Turn off camera
                                </button>

                                <button
                                    type="button"
                                    data-moderation-action="restrict_microphone">
                                    Restrict microphone
                                </button>

                                <button
                                    type="button"
                                    data-moderation-action="allow_microphone">
                                    Allow microphone
                                </button>

                                <button
                                    type="button"
                                    data-moderation-action="restrict_camera">
                                    Restrict camera
                                </button>

                                <button
                                    type="button"
                                    data-moderation-action="allow_camera">
                                    Allow camera
                                </button>

                                <button
                                    type="button"
                                    class="cx-meeting-moderation-danger"
                                    data-moderation-action="remove">
                                    Remove from meeting
                                </button>

                                <button
                                    type="button"
                                    class="cx-meeting-moderation-danger"
                                    data-moderation-action="remove_and_block">
                                    Remove and block rejoin
                                </button>

                            </div>

                        </div>
                    `
                    : ""
            );


            participant.innerHTML = `
                <span
                    class="cx-meeting-room-participant-avatar">

                    ${firstLetter}

                </span>

                <div
                    class="cx-meeting-room-participant-info">

                    <strong>
                        ${username}
                    </strong>

                    <small>
                        Participant
                    </small>

                </div>

                <span
                    class="cx-meeting-room-participant-state"
                    data-participant-state>

                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true">

                        <rect
                            x="9"
                            y="3"
                            width="6"
                            height="11"
                            rx="3">
                        </rect>

                        <path
                            d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11">
                        </path>

                    </svg>

                </span>

                ${moderationMarkup}
            `;


            return participant;

        }


        function addParticipant(
            data
        ) {

            if (!participantList) {

                return;

            }


            const participantId = String(
                data.user_id
            );


            const existingParticipant = (
                participantList.querySelector(
                    `[data-participant-id="${participantId}"]`
                )
            );


            if (existingParticipant) {

                if (data.participant_id) {

                    existingParticipant.dataset
                        .participantRecordId = (
                            String(
                                data.participant_id
                            )
                        );


                    existingParticipant.dataset
                        .moderationUrl = (
                            `/meetings/${meetingCode}`
                            + "/participants/"
                            + `${data.participant_id}`
                            + "/moderate/"
                        );

                }


                updateParticipantCount();

                return;

            }


            const participant = (
                createParticipantElement(
                    data
                )
            );


            participantList.appendChild(
                participant
            );


            updateParticipantCount();


            console.log(
                "Participant added to UI:",
                data.username
            );

        }


        function removeParticipant(
            data
        ) {

            if (!participantList) {

                return;

            }


            const participantId = String(
                data.user_id
            );


            const participant = (
                participantList.querySelector(
                    `[data-participant-id="${participantId}"]`
                )
            );


            if (!participant) {

                updateParticipantCount();

                return;

            }


            participant.remove();


            updateParticipantCount();


            console.log(
                "Participant removed from UI:",
                data.username
            );

        }


        /* ==================================================
           MODERATION MENU
        ================================================== */

        function closeModerationMenus() {

            document.querySelectorAll(
                "[data-moderation-menu]"
            ).forEach(
                (menu) => {

                    menu.hidden = true;

                }
            );


            document.querySelectorAll(
                "[data-moderation-trigger]"
            ).forEach(
                (trigger) => {

                    trigger.setAttribute(
                        "aria-expanded",
                        "false",
                    );

                }
            );

        }


        async function moderateParticipant(
            participant,
            action,
        ) {

            const moderationUrl = (
                participant
                    .dataset
                    .moderationUrl
            );


            if (!moderationUrl) {

                throw new Error(
                    "Moderation URL is unavailable."
                );

            }


            const response = await fetch(
                moderationUrl,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "X-CSRFToken":
                            getCsrfToken(),

                    },

                    body: JSON.stringify(
                        {
                            action: action,
                        }
                    ),
                }
            );


            const data = (
                await response.json()
            );


            if (!response.ok) {

                throw new Error(
                    data.error
                    || "Moderation action failed."
                );

            }


            return data;

        }


        function applyModerationEvent(
            data
        ) {

            const participant = (
                participantList
                    ?.querySelector(
                        `[data-participant-id="${data.user_id}"]`
                    )
            );


            if (participant) {

                participant.dataset
                    .participantMuted = (
                        String(
                            data.is_muted
                        )
                    );


                participant.dataset
                    .participantVideoEnabled = (
                        String(
                            data.is_video_enabled
                        )
                    );


                participant.dataset
                    .participantForcedMuted = (
                        String(
                            data.forced_muted
                        )
                    );


                participant.dataset
                    .participantForcedVideoDisabled = (
                        String(
                            data.forced_video_disabled
                        )
                    );

            }


            if (
                Number(
                    data.user_id
                ) !== currentUserId
            ) {

                return;

            }


            forcedMuted = Boolean(
                data.forced_muted
            );


            forcedVideoDisabled = Boolean(
                data.forced_video_disabled
            );


            isMuted = Boolean(
                data.is_muted
            );


            isVideoEnabled = Boolean(
                data.is_video_enabled
            );


            const audioTrack = (
                getAudioTrack()
            );


            if (audioTrack) {

                audioTrack.enabled = (
                    !isMuted
                    && !forcedMuted
                );

            }


            const videoTrack = (
                getVideoTrack()
            );


            if (videoTrack) {

                videoTrack.enabled = (
                    isVideoEnabled
                    && !forcedVideoDisabled
                );

            }


            setControlState(
                muteButton,
                isMuted,
                forcedMuted
                    ? "Muted by host"
                    : "Unmute",
                "Mute",
            );


            setControlState(
                cameraButton,
                !isVideoEnabled,
                forcedVideoDisabled
                    ? "Camera restricted"
                    : "Camera off",
                "Camera",
            );


            if (muteButton) {

                muteButton.disabled = (
                    forcedMuted
                );

            }


            if (cameraButton) {

                cameraButton.disabled = (
                    forcedVideoDisabled
                );

            }


            if (!isScreenSharing) {

                showCameraStream();

            }


            if (
                data.action === "remove"
                || data.action
                    === "remove_and_block"
            ) {

                showActivityToast(
                    data.action
                        === "remove_and_block"
                        ? (
                            "The host removed and blocked "
                            + "you from this meeting."
                        )
                        : (
                            "The host removed you "
                            + "from the meeting."
                        ),
                    "warning",
                );


                window.setTimeout(
                    () => {

                        window.location.href = (
                            "/meetings/"
                        );

                    },
                    1200,
                );

            }

        }


        /* ==================================================
           WEBSOCKET
        ================================================== */

        let meetingSocket = null;

        let signalingSocket = null;


        const peerConnections = new Map();

        const remoteStreams = new Map();

        const pendingIceCandidates = new Map();


        function getWebSocketUrl() {

            const protocol = (
                window.location.protocol === "https:"
                    ? "wss"
                    : "ws"
            );


            return (
                `${protocol}://`
                + `${window.location.host}`
                + `/ws/meetings/${meetingCode}/`
            );

        }


        function getSignalingWebSocketUrl() {

            const protocol = (
                window.location.protocol === "https:"
                    ? "wss"
                    : "ws"
            );


            return (
                `${protocol}://`
                + `${window.location.host}`
                + `/ws/signaling/meetings/${meetingCode}/`
            );

        }


        function connectMeetingSocket() {

            const socketUrl = (
                getWebSocketUrl()
            );


            meetingSocket = new WebSocket(
                socketUrl
            );


            meetingSocket.addEventListener(
                "open",
                () => {

                    console.log(
                        "ConnectX WebSocket connected."
                    );


                    meetingSocket.send(
                        JSON.stringify(
                            {
                                type: "ping",
                            }
                        )
                    );

                }
            );


            meetingSocket.addEventListener(
                "message",
                (event) => {

                    let data;


                    try {

                        data = JSON.parse(
                            event.data
                        );

                    } catch (error) {

                        console.error(
                            "Invalid WebSocket JSON:",
                            error
                        );

                        return;

                    }


                    console.log(
                        "ConnectX WebSocket message:",
                        data
                    );


                    if (
                        data.type
                        === "participant_joined"
                    ) {

                        addParticipant(
                            data
                        );


                        if (
                            Number(
                                data.user_id
                            ) !== currentUserId
                        ) {

                            showActivityToast(
                                `${data.username} joined the meeting.`,
                                "join",
                            );

                        }


                        return;

                    }


                    if (
                        data.type
                        === "participant_left"
                    ) {

                        removeParticipant(
                            data
                        );


                        if (
                            Number(
                                data.user_id
                            ) !== currentUserId
                        ) {

                            showActivityToast(
                                `${data.username} left the meeting.`,
                                "leave",
                            );

                        }


                        return;

                    }


                    if (
                        data.type
                        === "participant_state_changed"
                    ) {

                        const participant = (
                            participantList
                                ?.querySelector(
                                    `[data-participant-id="${data.user_id}"]`
                                )
                        );


                        if (participant) {

                            participant.dataset
                                .participantMuted = (
                                    String(
                                        data.is_muted
                                    )
                                );


                            participant.dataset
                                .participantVideoEnabled = (
                                    String(
                                        data.is_video_enabled
                                    )
                                );


                            participant.dataset
                                .participantScreenSharing = (
                                    String(
                                        data.is_screen_sharing
                                    )
                                );

                        }


                        return;

                    }


                    if (
                        data.type
                        === "participant_moderated"
                    ) {

                        applyModerationEvent(
                            data
                        );


                        return;

                    }


                    if (
                        data.type === "pong"
                    ) {

                        console.log(
                            "ConnectX WebSocket pong received."
                        );

                    }

                }
            );


            meetingSocket.addEventListener(
                "close",
                (event) => {

                    console.log(
                        "ConnectX WebSocket closed:",
                        event.code
                    );

                }
            );


            meetingSocket.addEventListener(
                "error",
                (error) => {

                    console.error(
                        "ConnectX WebSocket error:",
                        error
                    );

                }
            );

        }


        /* ==================================================
           SIGNALING SOCKET
        ================================================== */

        function connectSignalingSocket() {

            const socketUrl = (
                getSignalingWebSocketUrl()
            );


            signalingSocket = new WebSocket(
                socketUrl
            );


            signalingSocket.addEventListener(
                "open",
                () => {

                    console.log(
                        "ConnectX signaling WebSocket connected."
                    );


                    signalingSocket.send(
                        JSON.stringify(
                            {
                                type: "ping",
                            }
                        )
                    );

                }
            );


            signalingSocket.addEventListener(
                "message",
                (event) => {

                    let data;


                    try {

                        data = JSON.parse(
                            event.data
                        );

                    } catch (error) {

                        console.error(
                            "Invalid signaling WebSocket JSON:",
                            error
                        );

                        return;

                    }


                    console.log(
                        "ConnectX signaling message:",
                        data
                    );


                    if (
                        data.type
                        === "signaling_peer_ready"
                    ) {

                        console.log(
                            "Signaling peer ready:",
                            data.username,
                            data.user_id
                        );


                        return;

                    }


                    if (
                        data.type
                        === "webrtc_offer"
                    ) {

                        console.log(
                            "WebRTC offer received from:",
                            data.sender_username
                        );


                        return;

                    }


                    if (
                        data.type
                        === "webrtc_answer"
                    ) {

                        console.log(
                            "WebRTC answer received from:",
                            data.sender_username
                        );


                        return;

                    }


                    if (
                        data.type
                        === "webrtc_ice_candidate"
                    ) {

                        console.log(
                            "WebRTC ICE candidate received from:",
                            data.sender_username
                        );


                        return;

                    }


                    if (
                        data.type
                        === "pong"
                    ) {

                        console.log(
                            "ConnectX signaling WebSocket pong received."
                        );


                        return;

                    }


                    if (
                        data.type
                        === "error"
                    ) {

                        console.error(
                            "ConnectX signaling error:",
                            data.message
                        );

                    }

                }
            );


            signalingSocket.addEventListener(
                "close",
                (event) => {

                    console.log(
                        "ConnectX signaling WebSocket closed:",
                        event.code
                    );

                }
            );


            signalingSocket.addEventListener(
                "error",
                (error) => {

                    console.error(
                        "ConnectX signaling WebSocket error:",
                        error
                    );

                }
            );

        }


        /* ==================================================
           MEDIA HELPERS
        ================================================== */

        function getAudioTrack() {

            if (!localStream) {

                return null;

            }


            return (
                localStream
                    .getAudioTracks()[0]
                || null
            );

        }


        function getVideoTrack() {

            if (!localStream) {

                return null;

            }


            return (
                localStream
                    .getVideoTracks()[0]
                || null
            );

        }


        function getScreenTrack() {

            if (!screenStream) {

                return null;

            }


            return (
                screenStream
                    .getVideoTracks()[0]
                || null
            );

        }


        function updateVideoVisibility() {

            if (!localVideo) {

                return;

            }


            const videoTrack = (
                getVideoTrack()
            );


            const shouldShowVideo = (
                Boolean(
                    videoTrack
                )
                && isVideoEnabled
                && !forcedVideoDisabled
                && !isScreenSharing
            );


            localVideo.hidden = (
                !shouldShowVideo
            );


            if (videoPlaceholder) {

                videoPlaceholder.classList.toggle(
                    "cx-meeting-video-placeholder--hidden",
                    shouldShowVideo,
                );

            }

        }


        function showCameraStream() {

            if (!localVideo) {

                return;

            }


            localVideo.srcObject = (
                localStream
            );


            localVideo.classList.remove(
                "cx-meeting-local-video--screen"
            );


            updateVideoVisibility();

        }


        function showScreenStream() {

            if (!localVideo) {

                return;

            }


            localVideo.srcObject = (
                screenStream
            );


            localVideo.hidden = false;


            localVideo.classList.add(
                "cx-meeting-local-video--screen"
            );


            if (videoPlaceholder) {

                videoPlaceholder.classList.add(
                    "cx-meeting-video-placeholder--hidden"
                );

            }

        }


        /* ==================================================
           CSRF
        ================================================== */

        function getCsrfToken() {

            const cookieValue = (
                document.cookie
                    .split("; ")
                    .find(
                        (cookie) => (
                            cookie.startsWith(
                                "csrftoken="
                            )
                        )
                    )
            );


            if (!cookieValue) {

                return "";

            }


            return decodeURIComponent(
                cookieValue.split("=")[1]
            );

        }


        /* ==================================================
           PARTICIPANT STATE API
        ================================================== */

        async function updateParticipantState(
            state,
            value,
        ) {

            const response = await fetch(
                stateUrl,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "X-CSRFToken":
                            getCsrfToken(),

                    },

                    body: JSON.stringify(
                        {
                            state: state,
                            value: value,
                        }
                    ),
                }
            );


            const data = (
                await response.json()
            );


            if (!response.ok) {

                throw new Error(
                    data.error
                    || (
                        "Unable to update "
                        + "participant state."
                    )
                );

            }


            return data.participant;

        }


        /* ==================================================
           CONTROL STATE
        ================================================== */

        function setControlState(
            button,
            active,
            activeLabel,
            inactiveLabel,
        ) {

            if (!button) {

                return;

            }


            button.classList.toggle(
                "cx-meeting-control--active",
                active,
            );


            button.setAttribute(
                "aria-pressed",
                active.toString(),
            );


            const label = (
                button.querySelector(
                    "span"
                )
            );


            if (label) {

                label.textContent = (
                    active
                        ? activeLabel
                        : inactiveLabel
                );

            }

        }


        /* ==================================================
           LOCAL MEDIA
        ================================================== */

        async function initializeLocalMedia() {

            if (
                !navigator.mediaDevices
                || !navigator.mediaDevices.getUserMedia
            ) {

                console.warn(
                    "Media devices are not supported."
                );


                isMuted = true;

                isVideoEnabled = false;


                setControlState(
                    muteButton,
                    isMuted,
                    "Unmute",
                    "Mute",
                );


                setControlState(
                    cameraButton,
                    !isVideoEnabled,
                    "Camera off",
                    "Camera",
                );


                updateVideoVisibility();


                return;

            }


            const tracks = [];


            try {

                const audioStream = (
                    await navigator.mediaDevices
                        .getUserMedia(
                            {
                                audio: true,
                                video: false,
                            }
                        )
                );


                const audioTrack = (
                    audioStream
                        .getAudioTracks()[0]
                );


                if (audioTrack) {

                    audioTrack.enabled = (
                        !isMuted
                        && !forcedMuted
                    );


                    tracks.push(
                        audioTrack
                    );


                    console.log(
                        "ConnectX microphone available."
                    );

                }

            } catch (error) {

                console.warn(
                    "ConnectX microphone unavailable:",
                    error
                );


                isMuted = true;

            }


            try {

                const videoStream = (
                    await navigator.mediaDevices
                        .getUserMedia(
                            {
                                audio: false,
                                video: true,
                            }
                        )
                );


                const videoTrack = (
                    videoStream
                        .getVideoTracks()[0]
                );


                if (videoTrack) {

                    videoTrack.enabled = (
                        isVideoEnabled
                        && !forcedVideoDisabled
                    );


                    tracks.push(
                        videoTrack
                    );


                    console.log(
                        "ConnectX camera available."
                    );

                }

            } catch (error) {

                console.warn(
                    "ConnectX camera unavailable:",
                    error
                );


                isVideoEnabled = false;

            }


            localStream = new MediaStream(
                tracks
            );


            if (
                localVideo
                && localStream
                    .getVideoTracks()
                    .length > 0
            ) {

                localVideo.srcObject = (
                    localStream
                );


                try {

                    await localVideo.play();

                } catch (error) {

                    console.warn(
                        "Local video autoplay was blocked:",
                        error
                    );

                }

            }


            updateVideoVisibility();


            setControlState(
                muteButton,
                isMuted,
                forcedMuted
                    ? "Muted by host"
                    : "Unmute",
                "Mute",
            );


            setControlState(
                cameraButton,
                !isVideoEnabled,
                forcedVideoDisabled
                    ? "Camera restricted"
                    : "Camera off",
                "Camera",
            );


            if (muteButton) {

                muteButton.disabled = (
                    forcedMuted
                );

            }


            if (cameraButton) {

                cameraButton.disabled = (
                    forcedVideoDisabled
                );

            }


            try {

                await updateParticipantState(
                    "is_muted",
                    isMuted,
                );

            } catch (error) {

                console.error(
                    "Unable to synchronize microphone state:",
                    error
                );

            }


            try {

                await updateParticipantState(
                    "is_video_enabled",
                    isVideoEnabled,
                );

            } catch (error) {

                console.error(
                    "Unable to synchronize camera state:",
                    error
                );

            }


            console.log(
                "ConnectX local media initialized:",
                {
                    audioTracks: (
                        localStream
                            .getAudioTracks()
                            .length
                    ),

                    videoTracks: (
                        localStream
                            .getVideoTracks()
                            .length
                    ),
                }
            );

        }


        /* ==================================================
           MUTE CONTROL
        ================================================== */

        if (muteButton) {

            muteButton.addEventListener(
                "click",
                async () => {

                    if (forcedMuted) {

                        showActivityToast(
                            "Your microphone is restricted by the host.",
                            "warning",
                        );

                        return;

                    }


                    const nextMutedState = (
                        !isMuted
                    );


                    muteButton.disabled = true;


                    try {

                        const participant = (
                            await updateParticipantState(
                                "is_muted",
                                nextMutedState,
                            )
                        );


                        isMuted = (
                            participant.is_muted
                        );


                        const audioTrack = (
                            getAudioTrack()
                        );


                        if (audioTrack) {

                            audioTrack.enabled = (
                                !isMuted
                            );

                        }


                        setControlState(
                            muteButton,
                            isMuted,
                            "Unmute",
                            "Mute",
                        );

                    } catch (error) {

                        console.error(
                            "Mute update error:",
                            error
                        );


                        showActivityToast(
                            error.message,
                            "warning",
                        );

                    } finally {

                        muteButton.disabled = (
                            forcedMuted
                        );

                    }

                }
            );

        }


        /* ==================================================
           CAMERA CONTROL
        ================================================== */

        if (cameraButton) {

            cameraButton.addEventListener(
                "click",
                async () => {

                    if (forcedVideoDisabled) {

                        showActivityToast(
                            "Your camera is restricted by the host.",
                            "warning",
                        );

                        return;

                    }


                    const nextVideoState = (
                        !isVideoEnabled
                    );


                    cameraButton.disabled = true;


                    try {

                        const participant = (
                            await updateParticipantState(
                                "is_video_enabled",
                                nextVideoState,
                            )
                        );


                        isVideoEnabled = (
                            participant
                                .is_video_enabled
                        );


                        const videoTrack = (
                            getVideoTrack()
                        );


                        if (videoTrack) {

                            videoTrack.enabled = (
                                isVideoEnabled
                            );

                        }


                        if (!isScreenSharing) {

                            showCameraStream();

                        }


                        setControlState(
                            cameraButton,
                            !isVideoEnabled,
                            "Camera off",
                            "Camera",
                        );

                    } catch (error) {

                        console.error(
                            "Camera update error:",
                            error
                        );


                        showActivityToast(
                            error.message,
                            "warning",
                        );

                    } finally {

                        cameraButton.disabled = (
                            forcedVideoDisabled
                        );

                    }

                }
            );

        }


        /* ==================================================
           SCREEN SHARE
        ================================================== */

        async function stopScreenShare() {

            if (screenStream) {

                screenStream
                    .getTracks()
                    .forEach(
                        (track) => {

                            track.stop();

                        }
                    );


                screenStream = null;

            }


            isScreenSharing = false;


            try {

                const participant = (
                    await updateParticipantState(
                        "is_screen_sharing",
                        false,
                    )
                );


                isScreenSharing = (
                    participant.is_screen_sharing
                );

            } catch (error) {

                console.error(
                    "Stop screen share state error:",
                    error
                );

            }


            showCameraStream();


            if (
                localVideo
                && isVideoEnabled
            ) {

                try {

                    await localVideo.play();

                } catch (error) {

                    console.warn(
                        "Camera playback error:",
                        error
                    );

                }

            }


            setControlState(
                shareButton,
                false,
                "Stop share",
                "Share",
            );

        }


        async function startScreenShare() {

            if (
                !navigator.mediaDevices
                || !navigator.mediaDevices
                    .getDisplayMedia
            ) {

                showActivityToast(
                    "Screen sharing is not supported.",
                    "warning",
                );

                return;

            }


            try {

                screenStream = (
                    await navigator.mediaDevices
                        .getDisplayMedia(
                            {
                                video: true,
                                audio: false,
                            }
                        )
                );


                const screenTrack = (
                    getScreenTrack()
                );


                if (!screenTrack) {

                    throw new Error(
                        "Screen video track is unavailable."
                    );

                }


                const participant = (
                    await updateParticipantState(
                        "is_screen_sharing",
                        true,
                    )
                );


                isScreenSharing = (
                    participant.is_screen_sharing
                );


                showScreenStream();


                if (localVideo) {

                    await localVideo.play();

                }


                setControlState(
                    shareButton,
                    isScreenSharing,
                    "Stop share",
                    "Share",
                );


                screenTrack.addEventListener(
                    "ended",
                    () => {

                        stopScreenShare();

                    },
                    {
                        once: true,
                    }
                );

            } catch (error) {

                if (
                    error.name
                    === "NotAllowedError"
                ) {

                    console.log(
                        "Screen sharing was cancelled."
                    );

                } else {

                    console.error(
                        "Start screen share error:",
                        error
                    );


                    showActivityToast(
                        error.message,
                        "warning",
                    );

                }


                if (screenStream) {

                    screenStream
                        .getTracks()
                        .forEach(
                            (track) => {

                                track.stop();

                            }
                        );


                    screenStream = null;

                }


                isScreenSharing = false;


                setControlState(
                    shareButton,
                    false,
                    "Stop share",
                    "Share",
                );

            }

        }


        if (shareButton) {

            shareButton.addEventListener(
                "click",
                async () => {

                    shareButton.disabled = true;


                    try {

                        if (isScreenSharing) {

                            await stopScreenShare();

                        } else {

                            await startScreenShare();

                        }

                    } finally {

                        shareButton.disabled = false;

                    }

                }
            );

        }


        /* ==================================================
           PEOPLE PANEL
        ================================================== */

        if (
            peopleButton
            && participantPanel
        ) {

            peopleButton.addEventListener(
                "click",
                () => {

                    const isOpen = (
                        !participantPanel.hidden
                    );


                    participantPanel.hidden = (
                        isOpen
                    );


                    peopleButton.setAttribute(
                        "aria-expanded",
                        String(
                            !isOpen
                        ),
                    );


                    peopleButton.classList.toggle(
                        "cx-meeting-control--active",
                        !isOpen,
                    );

                }
            );

        }


        /* ==================================================
           MODERATION EVENTS
        ================================================== */

        if (participantList) {

            participantList.addEventListener(
                "click",
                async (event) => {

                    const trigger = (
                        event.target.closest(
                            "[data-moderation-trigger]"
                        )
                    );


                    if (trigger) {

                        const moderation = (
                            trigger.closest(
                                "[data-moderation]"
                            )
                        );


                        const menu = (
                            moderation?.querySelector(
                                "[data-moderation-menu]"
                            )
                        );


                        if (!menu) {

                            return;

                        }


                        const shouldOpen = (
                            menu.hidden
                        );


                        closeModerationMenus();


                        menu.hidden = (
                            !shouldOpen
                        );


                        trigger.setAttribute(
                            "aria-expanded",
                            String(
                                shouldOpen
                            ),
                        );


                        return;

                    }


                    const actionButton = (
                        event.target.closest(
                            "[data-moderation-action]"
                        )
                    );


                    if (!actionButton) {

                        return;

                    }


                    const participant = (
                        actionButton.closest(
                            "[data-participant-id]"
                        )
                    );


                    if (!participant) {

                        return;

                    }


                    const action = (
                        actionButton
                            .dataset
                            .moderationAction
                    );


                    actionButton.disabled = true;


                    try {

                        await moderateParticipant(
                            participant,
                            action,
                        );


                        closeModerationMenus();

                    } catch (error) {

                        console.error(
                            "Participant moderation error:",
                            error
                        );


                        showActivityToast(
                            error.message,
                            "warning",
                        );

                    } finally {

                        actionButton.disabled = false;

                    }

                }
            );

        }


        document.addEventListener(
            "click",
            (event) => {

                if (
                    !event.target.closest(
                        "[data-moderation]"
                    )
                ) {

                    closeModerationMenus();

                }

            }
        );


        /* ==================================================
           INITIAL CONTROL STATE
        ================================================== */

        setControlState(
            muteButton,
            isMuted,
            forcedMuted
                ? "Muted by host"
                : "Unmute",
            "Mute",
        );


        setControlState(
            cameraButton,
            !isVideoEnabled,
            forcedVideoDisabled
                ? "Camera restricted"
                : "Camera off",
            "Camera",
        );


        setControlState(
            shareButton,
            isScreenSharing,
            "Stop share",
            "Share",
        );


        if (muteButton) {

            muteButton.disabled = (
                forcedMuted
            );

        }


        if (cameraButton) {

            cameraButton.disabled = (
                forcedVideoDisabled
            );

        }


        /* ==================================================
           INITIAL PARTICIPANT COUNT
        ================================================== */

        updateParticipantCount();


        /* ==================================================
           INITIALIZE
        ================================================== */

        initializeLocalMedia();

        connectMeetingSocket();

        connectSignalingSocket();


        console.log(
            "ConnectX meeting room ready:",
            meetingCode,
            {
                currentUserId: currentUserId,
                currentUsername: currentUsername,
                isHost: isHost,
                hostModerationEnabled:
                    hostModerationEnabled,
            }
        );

    }
);