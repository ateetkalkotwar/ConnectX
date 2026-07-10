/* ==========================================================
   CONNECTX MEETING CONTROLS

   Responsibility:
   - Microphone toggle
   - Camera toggle
   - Forced moderation restrictions
   - Participant state synchronization
   - Microphone button UI
   - Camera button UI

   This module does NOT:
   - Handle screen sharing
   - Handle host moderation requests
   - Create WebRTC peers
   - Create WebSockets
========================================================== */


import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    getAudioTrack,
    getVideoTrack,
    showCameraStream,
} from "./media.js";


import {
    updateParticipantState,
} from "./meeting_api.js";


import {
    showActivityToast,
} from "./participants.js";


/* ==========================================================
   CONTROL RUNTIME
========================================================== */


let microphoneOperationPending = false;

let cameraOperationPending = false;

let controlsInitialized = false;


/* ==========================================================
   UPDATE MICROPHONE BUTTON UI
========================================================== */


function updateMicrophoneButtonUI() {

    const context = getMeetingContext();


    const microphoneButton = (

        context.elements.microphoneButton

        ??

        context.elements.muteButton

        ??

        document.querySelector(
            '[data-meeting-control="mute"]'
        )

    );


    if (!microphoneButton) {

        return;

    }


    const isUnavailable = (
        !getAudioTrack()
    );


    const isRestricted = (
        context.forcedMuted
    );


    const isMuted = (
        context.isMuted
        ||
        isRestricted
        ||
        isUnavailable
    );


    microphoneButton.classList.toggle(

        "cx-meeting-control--active",

        !isMuted

    );


    microphoneButton.classList.toggle(

        "cx-meeting-control--off",

        isMuted

    );


    microphoneButton.classList.toggle(

        "cx-meeting-control--restricted",

        isRestricted

    );


    microphoneButton.disabled = (

        microphoneOperationPending

        ||

        isUnavailable

        ||

        isRestricted

    );


    microphoneButton.setAttribute(

        "aria-pressed",

        String(
            !isMuted
        )

    );


    microphoneButton.setAttribute(

        "aria-label",

        isRestricted

            ? "Microphone restricted by host"

            : isUnavailable

                ? "Microphone unavailable"

                : isMuted

                    ? "Turn microphone on"

                    : "Turn microphone off"

    );


    const label = (

        microphoneButton.querySelector(
            "[data-control-label]"
        )

    );


    if (label) {

        label.textContent = (

            isRestricted

                ? "Mic restricted"

                : isUnavailable

                    ? "No mic"

                    : isMuted

                        ? "Unmute"

                        : "Mute"

        );

    }

}


/* ==========================================================
   UPDATE CAMERA BUTTON UI
========================================================== */


function updateCameraButtonUI() {

    const context = getMeetingContext();


    const cameraButton = (
        context.elements.cameraButton
    );


    if (!cameraButton) {

        return;

    }


    const isUnavailable = (
        !getVideoTrack()
    );


    const isRestricted = (
        context.forcedVideoDisabled
    );


    const isVideoEnabled = (

        context.isVideoEnabled

        &&

        !isRestricted

        &&

        !isUnavailable

    );


    cameraButton.classList.toggle(

        "cx-meeting-control--active",

        isVideoEnabled

    );


    cameraButton.classList.toggle(

        "cx-meeting-control--off",

        !isVideoEnabled

    );


    cameraButton.classList.toggle(

        "cx-meeting-control--restricted",

        isRestricted

    );


    cameraButton.disabled = (

        cameraOperationPending

        ||

        isUnavailable

        ||

        isRestricted

    );


    cameraButton.setAttribute(

        "aria-pressed",

        String(
            isVideoEnabled
        )

    );


    cameraButton.setAttribute(

        "aria-label",

        isRestricted

            ? "Camera restricted by host"

            : isUnavailable

                ? "Camera unavailable"

                : isVideoEnabled

                    ? "Turn camera off"

                    : "Turn camera on"

    );


    const label = (

        cameraButton.querySelector(
            "[data-control-label]"
        )

    );


    if (label) {

        label.textContent = (

            isRestricted

                ? "Camera restricted"

                : isUnavailable

                    ? "No camera"

                    : isVideoEnabled

                        ? "Camera"

                        : "Start video"

        );

    }

}


/* ==========================================================
   UPDATE CONTROL BUTTONS
========================================================== */


function updateControlButtonsUI() {

    updateMicrophoneButtonUI();

    updateCameraButtonUI();

}


/* ==========================================================
   SET MICROPHONE OPERATION STATE
========================================================== */


function setMicrophoneOperationPending(
    pending
) {

    microphoneOperationPending = Boolean(
        pending
    );


    updateMicrophoneButtonUI();

}


/* ==========================================================
   SET CAMERA OPERATION STATE
========================================================== */


function setCameraOperationPending(
    pending
) {

    cameraOperationPending = Boolean(
        pending
    );


    updateCameraButtonUI();

}


/* ==========================================================
   TOGGLE MICROPHONE
========================================================== */


async function toggleMicrophone() {

    const context = getMeetingContext();


    if (microphoneOperationPending) {

        return false;

    }


    if (context.forcedMuted) {

        showActivityToast(

            "Your microphone is restricted by the host.",

            "warning"

        );


        return false;

    }


    const audioTrack = getAudioTrack();


    if (!audioTrack) {

        showActivityToast(

            "No microphone is available.",

            "warning"

        );


        return false;

    }


    const previousMutedState = (
        context.isMuted
    );


    const nextMutedState = (
        !previousMutedState
    );


    setMicrophoneOperationPending(
        true
    );


    try {

        audioTrack.enabled = (
            !nextMutedState
        );


        context.isMuted = (
            nextMutedState
        );


        await updateParticipantState(

            context.stateUrl,

            "is_muted",

            nextMutedState

        );


        updateMicrophoneButtonUI();


        console.log(

            "ConnectX microphone state changed:",

            {

                isMuted: (
                    context.isMuted
                ),

            }

        );


        return true;

    } catch (error) {

        audioTrack.enabled = (
            !previousMutedState
        );


        context.isMuted = (
            previousMutedState
        );


        updateMicrophoneButtonUI();


        console.error(

            "ConnectX microphone toggle error:",

            error

        );


        showActivityToast(

            error.message
            ||
            "Unable to update microphone.",

            "warning"

        );


        return false;

    } finally {

        setMicrophoneOperationPending(
            false
        );

    }

}


/* ==========================================================
   TOGGLE CAMERA
========================================================== */


async function toggleCamera() {

    const context = getMeetingContext();


    if (cameraOperationPending) {

        return false;

    }


    if (context.forcedVideoDisabled) {

        showActivityToast(

            "Your camera is restricted by the host.",

            "warning"

        );


        return false;

    }


    const videoTrack = getVideoTrack();


    if (!videoTrack) {

        showActivityToast(

            "No camera is available.",

            "warning"

        );


        return false;

    }


    const previousVideoState = (
        context.isVideoEnabled
    );


    const nextVideoState = (
        !previousVideoState
    );


    setCameraOperationPending(
        true
    );


    try {

        videoTrack.enabled = (
            nextVideoState
        );


        context.isVideoEnabled = (
            nextVideoState
        );


        await updateParticipantState(

            context.stateUrl,

            "is_video_enabled",

            nextVideoState

        );


        if (
            !context.isScreenSharing
        ) {

            await showCameraStream();

        }


        updateCameraButtonUI();


        console.log(

            "ConnectX camera state changed:",

            {

                isVideoEnabled: (
                    context.isVideoEnabled
                ),

            }

        );


        return true;

    } catch (error) {

        videoTrack.enabled = (
            previousVideoState
        );


        context.isVideoEnabled = (
            previousVideoState
        );


        if (
            !context.isScreenSharing
        ) {

            try {

                await showCameraStream();

            } catch (previewError) {

                console.error(

                    "ConnectX camera preview restore error:",

                    previewError

                );

            }

        }


        updateCameraButtonUI();


        console.error(

            "ConnectX camera toggle error:",

            error

        );


        showActivityToast(

            error.message
            ||
            "Unable to update camera.",

            "warning"

        );


        return false;

    } finally {

        setCameraOperationPending(
            false
        );

    }

}


/* ==========================================================
   SYNCHRONIZE LOCAL CONTROL STATE

   Called when meeting_socket.js receives a moderation
   event affecting the current participant.
========================================================== */


function synchronizeLocalControlState() {

    const context = getMeetingContext();


    const audioTrack = getAudioTrack();

    const videoTrack = getVideoTrack();


    if (audioTrack) {

        audioTrack.enabled = (

            !context.isMuted

            &&

            !context.forcedMuted

        );

    }


    if (videoTrack) {

        videoTrack.enabled = (

            context.isVideoEnabled

            &&

            !context.forcedVideoDisabled

        );

    }


    updateControlButtonsUI();

}


/* ==========================================================
   INITIALIZE MEETING CONTROLS
========================================================== */


function initializeMeetingControls() {

    if (controlsInitialized) {

        return;

    }


    const context = getMeetingContext();


    const microphoneButton = (
        context.elements.microphoneButton
    );


    const cameraButton = (
        context.elements.cameraButton
    );


    if (microphoneButton) {

        microphoneButton.addEventListener(

            "click",

            () => {

                toggleMicrophone()
                    .catch(
                        (error) => {

                            console.error(

                                "ConnectX microphone control error:",

                                error

                            );

                        }
                    );

            }

        );

    } else {

        console.warn(
            "ConnectX microphone button was not found."
        );

    }


    if (cameraButton) {

        cameraButton.addEventListener(

            "click",

            () => {

                toggleCamera()
                    .catch(
                        (error) => {

                            console.error(

                                "ConnectX camera control error:",

                                error

                            );

                        }
                    );

            }

        );

    } else {

        console.warn(
            "ConnectX camera button was not found."
        );

    }


    controlsInitialized = true;


    updateControlButtonsUI();


    console.log(
        "ConnectX meeting controls initialized."
    );

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    updateMicrophoneButtonUI,

    updateCameraButtonUI,

    updateControlButtonsUI,

    toggleMicrophone,

    toggleCamera,

    synchronizeLocalControlState,

    initializeMeetingControls,

};