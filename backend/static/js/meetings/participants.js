/* ==========================================================
   CONNECTX MEETING PARTICIPANTS

   Responsibility:
   - Participant list UI
   - Participant identity normalization
   - Participant count
   - Dynamic participant creation
   - Dynamic participant removal
   - Participant state UI
   - Participant speaking UI
   - Participant activity toasts
   - Participant lookup by user ID
   - Participant lookup by participation ID

   Identity contract:

   participant.id
       =
   MeetingParticipant.id

   participant.user_id
       =
   User.id

   This module does NOT:
   - Create meeting WebSocket
   - Create signaling WebSocket
   - Manage WebRTC peers
   - Analyse audio streams
   - Send moderation requests
   - Access camera or microphone
========================================================== */


import {
    getMeetingContext,
} from "./meeting_context.js";


/* ==========================================================
   ESCAPE HTML
========================================================== */


function escapeHtml(
    value
) {

    const element = document.createElement(
        "div"
    );


    element.textContent = String(
        value ?? ""
    );


    return element.innerHTML;

}


/* ==========================================================
   NORMALIZE PARTICIPANT DATA
========================================================== */


function normalizeParticipantData(
    participant
) {

    if (
        !participant
        ||
        typeof participant !== "object"
    ) {

        console.warn(
            "ConnectX invalid participant data:",
            participant
        );


        return null;

    }


    const participantId = Number(
        participant.id
        ??
        participant.participant_id
    );


    const userId = Number(
        participant.user_id
    );


    if (

        !Number.isInteger(
            participantId
        )

        ||

        participantId <= 0

    ) {

        console.warn(
            "ConnectX invalid participant ID:",
            participant
        );


        return null;

    }


    if (

        !Number.isInteger(
            userId
        )

        ||

        userId <= 0

    ) {

        console.warn(
            "ConnectX invalid participant user ID:",
            participant
        );


        return null;

    }


    const username = String(

        participant.username

        ||

        `Participant ${userId}`

    ).trim();


    const role = String(

        participant.role

        ||

        "participant"

    );


    const moderationUrl = (

        participant.moderation_url

        ||

        null

    );


    return {

        id: participantId,

        user_id: userId,

        username: username,

        role: role,

        moderation_url: moderationUrl,

        is_muted: Boolean(
            participant.is_muted
        ),

        is_video_enabled: (

            participant.is_video_enabled
            !==
            false

        ),

        is_screen_sharing: Boolean(
            participant.is_screen_sharing
        ),

        forced_muted: Boolean(
            participant.forced_muted
        ),

        forced_video_disabled: Boolean(
            participant.forced_video_disabled
        ),

    };

}


/* ==========================================================
   GET PARTICIPANT BY PARTICIPANT ID
========================================================== */


function getParticipantById(
    participantId
) {

    const context = getMeetingContext();


    const normalizedParticipantId = Number(
        participantId
    );


    if (

        !Number.isInteger(
            normalizedParticipantId
        )

        ||

        normalizedParticipantId <= 0

    ) {

        return null;

    }


    return (

        context
            .elements
            .participantList
            ?.querySelector(

                `[data-participant-id="${normalizedParticipantId}"]`

            )

        ||

        null

    );

}


/* ==========================================================
   GET PARTICIPANT BY USER ID
========================================================== */


function getParticipantByUserId(
    userId
) {

    const context = getMeetingContext();


    const normalizedUserId = Number(
        userId
    );


    if (

        !Number.isInteger(
            normalizedUserId
        )

        ||

        normalizedUserId <= 0

    ) {

        return null;

    }


    return (

        context
            .elements
            .participantList
            ?.querySelector(

                `[data-user-id="${normalizedUserId}"]`

            )

        ||

        null

    );

}


/* ==========================================================
   UPDATE PARTICIPANT COUNT
========================================================== */


function updateParticipantCount() {

    const context = getMeetingContext();


    const participantList = (
        context.elements.participantList
    );


    const participantCount = (
        context.elements.participantCount
    );


    if (
        !participantList
        ||
        !participantCount
    ) {

        return;

    }


    const participants = (

        participantList.querySelectorAll(
            "[data-user-id]"
        )

    );


    participantCount.textContent = String(
        participants.length
    );


    console.log(

        "ConnectX participant count updated:",

        participants.length

    );

}


/* ==========================================================
   GET PARTICIPANT ROLE LABEL
========================================================== */


function getParticipantRoleLabel(
    role
) {

    switch (
        role
    ) {

        case "host":

            return "Host";


        case "co_host":

            return "Co-host";


        default:

            return "Participant";

    }

}


/* ==========================================================
   CREATE SPEAKING INDICATOR MARKUP
========================================================== */


function createSpeakingIndicatorMarkup() {

    return `

        <span
            class="cx-participant-speaking-indicator"
            data-participant-speaking-indicator
            title="Speaking"
            aria-label="Speaking"
            aria-hidden="true">

            <span
                class="cx-participant-speaking-bar">
            </span>

            <span
                class="cx-participant-speaking-bar">
            </span>

            <span
                class="cx-participant-speaking-bar">
            </span>

        </span>

    `;

}


/* ==========================================================
   ENSURE SPEAKING INDICATOR
========================================================== */


function ensureSpeakingIndicator(
    participantElement
) {

    if (!participantElement) {

        return null;

    }


    let speakingIndicator = (

        participantElement.querySelector(
            "[data-participant-speaking-indicator]"
        )

    );


    if (speakingIndicator) {

        return speakingIndicator;

    }


    const participantInfo = (

        participantElement.querySelector(
            ".cx-meeting-room-participant-info"
        )

    );


    if (!participantInfo) {

        return null;

    }


    const indicatorContainer = (
        document.createElement(
            "span"
        )
    );


    indicatorContainer.innerHTML = (
        createSpeakingIndicatorMarkup()
    );


    speakingIndicator = (

        indicatorContainer.firstElementChild

    );


    if (!speakingIndicator) {

        return null;

    }


    participantInfo.appendChild(
        speakingIndicator
    );


    return speakingIndicator;

}


/* ==========================================================
   SET PARTICIPANT SPEAKING STATE
========================================================== */


function setParticipantSpeaking(
    userId,
    speaking,
    audioLevel = 0
) {

    const normalizedUserId = Number(
        userId
    );


    if (

        !Number.isInteger(
            normalizedUserId
        )

        ||

        normalizedUserId <= 0

    ) {

        return false;

    }


    const participantElement = (

        getParticipantByUserId(
            normalizedUserId
        )

    );


    if (!participantElement) {

        return false;

    }


    const isSpeaking = Boolean(
        speaking
    );


    const normalizedAudioLevel = Math.max(

        0,

        Math.min(

            1,

            Number(audioLevel)
            ||
            0

        )

    );


    const speakingIndicator = (

        ensureSpeakingIndicator(
            participantElement
        )

    );


    participantElement.classList.toggle(

        "cx-meeting-room-participant--speaking",

        isSpeaking

    );


    participantElement.dataset.speaking = String(
        isSpeaking
    );


    participantElement.style.setProperty(

        "--cx-participant-audio-level",

        String(
            normalizedAudioLevel
        )

    );


    if (speakingIndicator) {

        speakingIndicator.classList.toggle(

            "cx-participant-speaking-indicator--active",

            isSpeaking

        );


        speakingIndicator.setAttribute(

            "aria-hidden",

            String(
                !isSpeaking
            )

        );

    }


    const videoTile = document.querySelector(

        `[data-remote-video-user-id="${normalizedUserId}"]`

    );


    if (videoTile) {

        videoTile.classList.toggle(

            "cx-meeting-video-tile--speaking",

            isSpeaking

        );


        videoTile.style.setProperty(

            "--cx-participant-audio-level",

            String(
                normalizedAudioLevel
            )

        );

    }


    return true;

}


/* ==========================================================
   CLEAR PARTICIPANT SPEAKING STATE
========================================================== */


function clearParticipantSpeaking(
    userId
) {

    return setParticipantSpeaking(

        userId,

        false,

        0

    );

}


/* ==========================================================
   CREATE PARTICIPANT STATE MARKUP
========================================================== */


function createParticipantStateMarkup(
    participant
) {

    const microphoneState = (

        participant.is_muted
        ||
        participant.forced_muted

            ? "Muted"

            : "Microphone on"

    );


    const videoState = (

        participant.is_video_enabled
        &&
        !participant.forced_video_disabled

            ? "Camera on"

            : "Camera off"

    );


    const screenState = (

        participant.is_screen_sharing

            ? `
                <span
                    class="cx-meeting-room-participant-screen"
                    data-participant-screen-state
                    title="Sharing screen"
                    aria-label="Sharing screen">

                    Screen

                </span>
            `

            : ""

    );


    return `

        <span
            class="cx-meeting-room-participant-state"
            data-participant-media-state>

            <span
                data-participant-microphone-state
                title="${escapeHtml(microphoneState)}"
                aria-label="${escapeHtml(microphoneState)}">

                ${
                    participant.is_muted
                    ||
                    participant.forced_muted

                        ? "Mic off"

                        : "Mic on"
                }

            </span>


            <span
                data-participant-video-state
                title="${escapeHtml(videoState)}"
                aria-label="${escapeHtml(videoState)}">

                ${
                    participant.is_video_enabled
                    &&
                    !participant.forced_video_disabled

                        ? "Video on"

                        : "Video off"
                }

            </span>


            ${screenState}

        </span>

    `;

}


/* ==========================================================
   CREATE MODERATION MENU
========================================================== */


function createModerationMenuMarkup(
    participant
) {

    const context = getMeetingContext();


    if (!context.isHost) {

        return "";

    }


    if (
        participant.user_id
        ===
        context.currentUserId
    ) {

        return "";

    }


    if (!participant.moderation_url) {

        return "";

    }


    return `

        <div
            class="cx-meeting-room-participant-actions">

            <button
                type="button"
                class="cx-meeting-room-participant-menu-button"
                data-participant-menu-button
                aria-label="Participant controls"
                aria-haspopup="menu">

                ⋮

            </button>


            <div
                class="cx-meeting-room-participant-menu"
                data-participant-menu
                role="menu"
                hidden>

                <button
                    type="button"
                    data-moderation-action="soft_mute"
                    role="menuitem">

                    Mute participant

                </button>


                <button
                    type="button"
                    data-moderation-action="force_mute"
                    role="menuitem">

                    Force mute

                </button>


                <button
                    type="button"
                    data-moderation-action="disable_camera"
                    role="menuitem">

                    Turn camera off

                </button>


                <button
                    type="button"
                    data-moderation-action="restrict_camera"
                    role="menuitem">

                    Restrict camera

                </button>


                <button
                    type="button"
                    data-moderation-action="remove"
                    role="menuitem">

                    Remove participant

                </button>

            </div>

        </div>

    `;

}


/* ==========================================================
   CREATE PARTICIPANT ELEMENT
========================================================== */


function createParticipantElement(
    participantData
) {

    const participant = (

        normalizeParticipantData(
            participantData
        )

    );


    if (!participant) {

        return null;

    }


    const participantElement = (

        document.createElement(
            "article"
        )

    );


    participantElement.className = (
        "cx-meeting-room-participant"
    );


    participantElement.dataset.participantId = String(
        participant.id
    );


    participantElement.dataset.userId = String(
        participant.user_id
    );


    participantElement.dataset.participantUsername = (
        participant.username
    );


    participantElement.dataset.participantRole = (
        participant.role
    );


    participantElement.dataset.speaking = (
        "false"
    );


    if (participant.moderation_url) {

        participantElement.dataset.moderationUrl = (
            participant.moderation_url
        );

    }


    const safeUsername = escapeHtml(
        participant.username
    );


    const firstLetter = escapeHtml(

        participant
            .username
            .charAt(0)
            .toUpperCase()

        ||

        "P"

    );


    const roleLabel = escapeHtml(

        getParticipantRoleLabel(
            participant.role
        )

    );


    participantElement.innerHTML = `

        <span
            class="cx-meeting-room-participant-avatar">

            ${firstLetter}

        </span>


        <div
            class="cx-meeting-room-participant-info">

            <strong
                data-participant-username>

                ${safeUsername}

            </strong>


            <small
                data-participant-role>

                ${roleLabel}

            </small>


            ${createSpeakingIndicatorMarkup()}

        </div>


        ${createParticipantStateMarkup(
            participant
        )}


        ${createModerationMenuMarkup(
            participant
        )}

    `;


    return participantElement;

}


/* ==========================================================
   UPDATE PARTICIPANT STATE UI
========================================================== */


function updateParticipantStateUI(
    participantData
) {

    const participant = (

        normalizeParticipantData(
            participantData
        )

    );


    if (!participant) {

        return false;

    }


    const participantElement = (

        getParticipantByUserId(
            participant.user_id
        )

    );


    if (!participantElement) {

        return false;

    }


    participantElement.dataset.participantId = String(
        participant.id
    );


    participantElement.dataset.userId = String(
        participant.user_id
    );


    participantElement.dataset.participantUsername = (
        participant.username
    );


    participantElement.dataset.participantRole = (
        participant.role
    );


    if (participant.moderation_url) {

        participantElement.dataset.moderationUrl = (
            participant.moderation_url
        );

    }


    ensureSpeakingIndicator(
        participantElement
    );


    const usernameElement = (

        participantElement.querySelector(
            "[data-participant-username]"
        )

    );


    const roleElement = (

        participantElement.querySelector(
            "[data-participant-role]"
        )

    );


    const microphoneState = (

        participantElement.querySelector(
            "[data-participant-microphone-state]"
        )

    );


    const videoState = (

        participantElement.querySelector(
            "[data-participant-video-state]"
        )

    );


    const mediaState = (

        participantElement.querySelector(
            "[data-participant-media-state]"
        )

    );


    if (usernameElement) {

        usernameElement.textContent = (
            participant.username
        );

    }


    if (roleElement) {

        roleElement.textContent = (

            getParticipantRoleLabel(
                participant.role
            )

        );

    }


    if (microphoneState) {

        const microphoneLabel = (

            participant.is_muted
            ||
            participant.forced_muted

                ? "Muted"

                : "Microphone on"

        );


        microphoneState.textContent = (

            participant.is_muted
            ||
            participant.forced_muted

                ? "Mic off"

                : "Mic on"

        );


        microphoneState.title = (
            microphoneLabel
        );


        microphoneState.setAttribute(

            "aria-label",

            microphoneLabel

        );


        if (
            participant.is_muted
            ||
            participant.forced_muted
        ) {

            clearParticipantSpeaking(
                participant.user_id
            );

        }

    }


    if (videoState) {

        const hasVideo = (

            participant.is_video_enabled

            &&

            !participant.forced_video_disabled

        );


        const videoLabel = (

            hasVideo

                ? "Camera on"

                : "Camera off"

        );


        videoState.textContent = (

            hasVideo

                ? "Video on"

                : "Video off"

        );


        videoState.title = (
            videoLabel
        );


        videoState.setAttribute(

            "aria-label",

            videoLabel

        );

    }


    const existingScreenState = (

        participantElement.querySelector(
            "[data-participant-screen-state]"
        )

    );


    if (
        participant.is_screen_sharing
        &&
        !existingScreenState
        &&
        mediaState
    ) {

        const screenState = (

            document.createElement(
                "span"
            )

        );


        screenState.className = (
            "cx-meeting-room-participant-screen"
        );


        screenState.dataset.participantScreenState = "";


        screenState.textContent = (
            "Screen"
        );


        screenState.title = (
            "Sharing screen"
        );


        screenState.setAttribute(

            "aria-label",

            "Sharing screen"

        );


        mediaState.appendChild(
            screenState
        );

    }


    if (
        !participant.is_screen_sharing
        &&
        existingScreenState
    ) {

        existingScreenState.remove();

    }


    console.log(

        "ConnectX participant state UI updated:",

        {

            participantId: participant.id,

            userId: participant.user_id,

            username: participant.username,

        }

    );


    return true;

}


/* ==========================================================
   ADD PARTICIPANT
========================================================== */


function addParticipant(
    participantData
) {

    const context = getMeetingContext();


    const participantList = (
        context.elements.participantList
    );


    if (!participantList) {

        return null;

    }


    const participant = (

        normalizeParticipantData(
            participantData
        )

    );


    if (!participant) {

        return null;

    }


    const existingParticipant = (

        getParticipantByUserId(
            participant.user_id
        )

    );


    if (existingParticipant) {

        updateParticipantStateUI(
            participant
        );


        updateParticipantCount();


        return existingParticipant;

    }


    const participantElement = (

        createParticipantElement(
            participant
        )

    );


    if (!participantElement) {

        return null;

    }


    participantList.appendChild(
        participantElement
    );


    updateParticipantCount();


    console.log(

        "ConnectX participant added to UI:",

        {

            participantId: participant.id,

            userId: participant.user_id,

            username: participant.username,

        }

    );


    return participantElement;

}


/* ==========================================================
   REMOVE PARTICIPANT
========================================================== */


function removeParticipant(
    participantData
) {

    const userId = Number(

        participantData?.user_id

        ??

        participantData?.userId

    );


    if (

        !Number.isInteger(
            userId
        )

        ||

        userId <= 0

    ) {

        console.warn(

            "ConnectX invalid participant removal data:",

            participantData

        );


        return false;

    }


    const participantElement = (

        getParticipantByUserId(
            userId
        )

    );


    if (!participantElement) {

        updateParticipantCount();


        return false;

    }


    const username = (

        participantElement
            .dataset
            .participantUsername

        ||

        participantData?.username

        ||

        `Participant ${userId}`

    );


    clearParticipantSpeaking(
        userId
    );


    participantElement.remove();


    updateParticipantCount();


    console.log(

        "ConnectX participant removed from UI:",

        {

            userId: userId,

            username: username,

        }

    );


    return true;

}


/* ==========================================================
   ACTIVITY TOAST CONTAINER
========================================================== */


function getActivityToastContainer() {

    let container = document.querySelector(
        "[data-meeting-activity-toasts]"
    );


    if (container) {

        return container;

    }


    container = document.createElement(
        "div"
    );


    container.className = (
        "cx-meeting-activity-toasts"
    );


    container.dataset.meetingActivityToasts = "";


    container.setAttribute(
        "aria-live",
        "polite"
    );


    container.setAttribute(
        "aria-atomic",
        "false"
    );


    document.body.appendChild(
        container
    );


    return container;

}


/* ==========================================================
   SHOW ACTIVITY TOAST
========================================================== */


function showActivityToast(
    message,
    type = "info"
) {

    const container = (

        getActivityToastContainer()

    );


    const toast = document.createElement(
        "div"
    );


    toast.className = (

        "cx-meeting-activity-toast"

        +

        ` cx-meeting-activity-toast--${type}`

    );


    toast.setAttribute(
        "role",
        type === "warning"
            ? "alert"
            : "status"
    );


    toast.textContent = String(
        message
    );


    container.appendChild(
        toast
    );


    window.setTimeout(

        () => {

            toast.classList.add(
                "cx-meeting-activity-toast--visible"
            );

        },

        10

    );


    window.setTimeout(

        () => {

            toast.classList.remove(
                "cx-meeting-activity-toast--visible"
            );


            window.setTimeout(

                () => {

                    toast.remove();

                },

                250

            );

        },

        3500

    );


    return toast;

}


/* ==========================================================
   INITIALIZE SERVER-RENDERED PARTICIPANTS
========================================================== */


function initializeServerRenderedParticipants() {

    const context = getMeetingContext();


    const participantList = (
        context.elements.participantList
    );


    if (!participantList) {

        return;

    }


    const participants = (

        participantList.querySelectorAll(
            "[data-participant-id]"
        )

    );


    participants.forEach(
        (participantElement) => {

            const participantId = Number(

                participantElement
                    .dataset
                    .participantId

            );


            const userId = Number(

                participantElement
                    .dataset
                    .userId

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

                    "ConnectX server-rendered participant "
                    +
                    "has invalid identity data:",

                    participantElement

                );


                return;

            }


            participantElement.dataset.speaking = (
                "false"
            );


            ensureSpeakingIndicator(
                participantElement
            );

        }
    );


    updateParticipantCount();

}


/* ==========================================================
   INITIALIZE PARTICIPANTS
========================================================== */


function initializeParticipants() {

    initializeServerRenderedParticipants();


    console.log(
        "ConnectX participants initialized."
    );

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    escapeHtml,

    normalizeParticipantData,

    getParticipantById,

    getParticipantByUserId,

    updateParticipantCount,

    setParticipantSpeaking,

    clearParticipantSpeaking,

    createParticipantElement,

    updateParticipantStateUI,

    addParticipant,

    removeParticipant,

    showActivityToast,

    initializeParticipants,

};