/* ==========================================================
   CONNECTX SCREEN SHARE

   Responsibility:
   - Start screen capture
   - Stop screen capture
   - Replace outgoing WebRTC video track
   - Restore camera track
   - Handle browser-native Stop sharing
   - Synchronize screen-sharing state
   - Screen-share control UI

   This module does NOT:
   - Create RTCPeerConnection
   - Create WebSockets
   - Initialize camera or microphone
   - Perform host moderation
========================================================== */


import {
    updateParticipantState,
} from "./meeting_api.js";

import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    getVideoTrack,
    getScreenTrack,
    showCameraStream,
    showScreenStream,
    stopMediaStream,
} from "./media.js";


import {
    replaceOutgoingVideoTrack,
} from "./webrtc.js";


import {
    showActivityToast,
} from "./participants.js";


/* ==========================================================
   SCREEN SHARE RUNTIME
========================================================== */


let screenShareOperationPending = false;

let screenTrackEndedHandler = null;



/* ==========================================================
   UPDATE SHARE BUTTON
========================================================== */


function updateShareButtonUI() {

    const context = getMeetingContext();


    const shareButton = (
        context.elements.shareButton
    );


    if (!shareButton) {

        return;

    }


    const isSharing = (
        context.isScreenSharing
    );


    shareButton.classList.toggle(

        "cx-meeting-control--active",

        isSharing

    );


    shareButton.classList.toggle(

        "cx-meeting-control--disabled",

        screenShareOperationPending

    );


    shareButton.disabled = (
        screenShareOperationPending
    );


    shareButton.setAttribute(

        "aria-pressed",

        String(
            isSharing
        )

    );


    shareButton.setAttribute(

        "aria-label",

        isSharing

            ? "Stop sharing screen"

            : "Share screen"

    );


    const label = (

        shareButton.querySelector(
            "[data-control-label]"
        )

    );


    if (label) {

        label.textContent = (

            isSharing

                ? "Stop share"

                : "Share"

        );

    }

}


/* ==========================================================
   SET SCREEN SHARE OPERATION STATE
========================================================== */


function setScreenShareOperationPending(
    pending
) {

    screenShareOperationPending = Boolean(
        pending
    );


    updateShareButtonUI();

}


/* ==========================================================
   DETACH SCREEN TRACK ENDED HANDLER
========================================================== */


function detachScreenTrackEndedHandler() {

    const screenTrack = getScreenTrack();


    if (
        !screenTrack
        ||
        !screenTrackEndedHandler
    ) {

        screenTrackEndedHandler = null;


        return;

    }


    screenTrack.removeEventListener(

        "ended",

        screenTrackEndedHandler

    );


    screenTrackEndedHandler = null;

}


/* ==========================================================
   RESTORE CAMERA TRACK
========================================================== */


async function restoreCameraTrack() {

    const cameraTrack = getVideoTrack();


    await replaceOutgoingVideoTrack(
        cameraTrack
    );


    await showCameraStream();


    return cameraTrack;

}


/* ==========================================================
   RELEASE SCREEN STREAM
========================================================== */


function releaseScreenStream() {

    const context = getMeetingContext();


    detachScreenTrackEndedHandler();


    stopMediaStream(
        context.screenStream
    );


    context.screenStream = null;

}


/* ==========================================================
   STOP SCREEN SHARE
========================================================== */


async function stopScreenShare(
    options = {}
) {

    const context = getMeetingContext();


    if (screenShareOperationPending) {

        return false;

    }


    const synchronizeState = (

        options.synchronizeState
        !==
        false

    );


    const showToast = (

        options.showToast
        !==
        false

    );


    setScreenShareOperationPending(
        true
    );


    try {

        await restoreCameraTrack();


        releaseScreenStream();


        context.isScreenSharing = false;


        if (synchronizeState) {

            await updateParticipantState(

                context.stateUrl,

                "is_screen_sharing",

                false

            );

        }


        updateShareButtonUI();


        if (showToast) {

            showActivityToast(

                "Screen sharing stopped.",

                "info"

            );

        }


        console.log(
            "ConnectX screen sharing stopped."
        );


        return true;

    } catch (error) {

        console.error(

            "ConnectX stop screen share error:",

            error

        );


        /*
         * The browser screen capture may already
         * have ended.
         *
         * We still restore local runtime state.
         */


        releaseScreenStream();


        context.isScreenSharing = false;


        try {

            await restoreCameraTrack();

        } catch (restoreError) {

            console.error(

                "ConnectX camera restore error:",

                restoreError

            );

        }


        updateShareButtonUI();


        if (showToast) {

            showActivityToast(

                error.message
                ||
                "Unable to stop screen sharing.",

                "warning"

            );

        }


        return false;

    } finally {

        setScreenShareOperationPending(
            false
        );

    }

}


/* ==========================================================
   HANDLE BROWSER SCREEN SHARE ENDED
========================================================== */


async function handleScreenTrackEnded() {

    const context = getMeetingContext();


    if (!context.isScreenSharing) {

        return;

    }


    console.log(
        "ConnectX browser screen sharing ended."
    );


    await stopScreenShare({

        synchronizeState: true,

        showToast: true,

    });

}


/* ==========================================================
   START SCREEN SHARE
========================================================== */


async function startScreenShare() {

    const context = getMeetingContext();


    if (screenShareOperationPending) {

        return false;

    }


    if (context.isScreenSharing) {

        return true;

    }


    if (

        !navigator.mediaDevices

        ||

        !navigator.mediaDevices.getDisplayMedia

    ) {

        showActivityToast(

            "Screen sharing is not supported by this browser.",

            "warning"

        );


        return false;

    }


    setScreenShareOperationPending(
        true
    );


    let screenStream = null;


    try {

        screenStream = (

            await navigator
                .mediaDevices
                .getDisplayMedia({

                    video: true,

                    audio: false,

                })

        );


        const screenTrack = (

            screenStream
                .getVideoTracks()[0]

        );


        if (!screenTrack) {

            stopMediaStream(
                screenStream
            );


            throw new Error(
                "Screen capture did not provide a video track."
            );

        }


        context.screenStream = (
            screenStream
        );


        screenTrackEndedHandler = () => {

            handleScreenTrackEnded()
                .catch(
                    (error) => {

                        console.error(

                            "ConnectX screen ended handler error:",

                            error

                        );

                    }
                );

        };


        screenTrack.addEventListener(

            "ended",

            screenTrackEndedHandler

        );


        await replaceOutgoingVideoTrack(
            screenTrack
        );


        await showScreenStream();


        context.isScreenSharing = true;


        try {

            await updateParticipantState(

                context.stateUrl,

                "is_screen_sharing",

                true

            );

        } catch (stateError) {

            /*
             * Backend synchronization failed.
             *
             * Do not continue sharing with the
             * server believing the participant
             * is not sharing.
             */


            console.error(

                "ConnectX screen share state synchronization error:",

                stateError

            );


            context.isScreenSharing = false;


            await restoreCameraTrack();


            releaseScreenStream();


            throw stateError;

        }


        updateShareButtonUI();


        showActivityToast(

            "You are sharing your screen.",

            "info"

        );


        console.log(
            "ConnectX screen sharing started."
        );


        return true;

    } catch (error) {

        if (
            error.name === "NotAllowedError"
        ) {

            console.log(
                "ConnectX screen sharing permission was not granted."
            );


            return false;

        }


        if (
            error.name === "AbortError"
        ) {

            console.log(
                "ConnectX screen sharing was cancelled."
            );


            return false;

        }


        console.error(

            "ConnectX start screen share error:",

            error

        );


        if (
            screenStream
            &&
            context.screenStream !== screenStream
        ) {

            stopMediaStream(
                screenStream
            );

        }


        showActivityToast(

            error.message
            ||
            "Unable to start screen sharing.",

            "warning"

        );


        return false;

    } finally {

        setScreenShareOperationPending(
            false
        );

    }

}


/* ==========================================================
   TOGGLE SCREEN SHARE
========================================================== */


async function toggleScreenShare() {

    const context = getMeetingContext();


    if (context.isScreenSharing) {

        return stopScreenShare();

    }


    return startScreenShare();

}


/* ==========================================================
   INITIALIZE SCREEN SHARE
========================================================== */


function initializeScreenShare() {

    const context = getMeetingContext();


    const shareButton = (
        context.elements.shareButton
    );


    updateShareButtonUI();


    if (!shareButton) {

        console.warn(
            "ConnectX screen share button was not found."
        );


        return;

    }


    shareButton.addEventListener(

        "click",

        () => {

            toggleScreenShare()
                .catch(
                    (error) => {

                        console.error(

                            "ConnectX screen share toggle error:",

                            error

                        );

                    }
                );

        }

    );


    console.log(
        "ConnectX screen sharing initialized."
    );

}


/* ==========================================================
   CLEANUP SCREEN SHARE
========================================================== */


async function cleanupScreenShare() {

    const context = getMeetingContext();


    if (
        context.isScreenSharing
        ||
        context.screenStream
    ) {

        await stopScreenShare({

            synchronizeState: false,

            showToast: false,

        });


        return;

    }


    releaseScreenStream();


    context.isScreenSharing = false;


    updateShareButtonUI();

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    updateShareButtonUI,

    startScreenShare,

    stopScreenShare,

    toggleScreenShare,

    initializeScreenShare,

    cleanupScreenShare,

};