/* ==========================================================
   CONNECTX MEDIA

   Responsibility:
   - Camera initialization
   - Microphone initialization
   - Device fallback
   - Local MediaStream
   - Media track helpers
   - Local video rendering
   - Local media cleanup

   This module does NOT:
   - Create WebSockets
   - Create RTCPeerConnection
   - Perform WebRTC signaling
   - Manage participants
   - Perform host moderation
========================================================== */


import {
    getMeetingContext,
} from "./meeting_context.js";


/* ==========================================================
   CAMERA RECOVERY
========================================================== */

let cameraRecoveryInProgress = false;

let cameraDeviceChangeHandler = null;


/* ==========================================================
   AUDIO TRACK
========================================================== */


function getAudioTrack() {

    const context = getMeetingContext();


    if (!context.localStream) {

        return null;

    }


    return (
        context
            .localStream
            .getAudioTracks()[0]
        ||
        null
    );

}


/* ==========================================================
   VIDEO TRACK
========================================================== */


function getVideoTrack() {

    const context = getMeetingContext();


    if (!context.localStream) {

        return null;

    }


    return (
        context
            .localStream
            .getVideoTracks()[0]
        ||
        null
    );

}


/* ==========================================================
   SCREEN TRACK
========================================================== */


function getScreenTrack() {

    const context = getMeetingContext();


    if (!context.screenStream) {

        return null;

    }


    return (
        context
            .screenStream
            .getVideoTracks()[0]
        ||
        null
    );

}


/* ==========================================================
   LOCAL VIDEO VISIBILITY
========================================================== */


function updateLocalVideoVisibility() {

    const context = getMeetingContext();


    const localVideo = (
        context.elements.localVideo
    );


    const videoPlaceholder = (
        context.elements.videoPlaceholder
    );


    if (!localVideo) {

        return;

    }


    const videoTrack = getVideoTrack();


    const shouldShowVideo = (

        Boolean(videoTrack)

        &&

        videoTrack.readyState === "live"

        &&

        context.isVideoEnabled

        &&

        !context.forcedVideoDisabled

        &&

        !context.isScreenSharing

    );

    console.log(
        "ConnectX LOCAL VIDEO VISIBILITY:",
        {
            hasVideoTrack: Boolean(videoTrack),
            videoTrackReadyState: videoTrack
                ? videoTrack.readyState
                : null,
            isVideoEnabled: context.isVideoEnabled,
            forcedVideoDisabled: context.forcedVideoDisabled,
            isScreenSharing: context.isScreenSharing,
            shouldShowVideo: shouldShowVideo,
            localVideoHiddenBefore: localVideo.hidden,
        }
    );


    localVideo.hidden = (
        !shouldShowVideo
    );


    if (videoPlaceholder) {

        videoPlaceholder.classList.toggle(

            "cx-meeting-video-placeholder--hidden",

            shouldShowVideo

        );

    }

}


/* ==========================================================
   SHOW CAMERA STREAM
========================================================== */


async function showCameraStream() {

    const context = getMeetingContext();


    const localVideo = (
        context.elements.localVideo
    );


    if (!localVideo) {

        return;

    }


    localVideo.srcObject = (
        context.localStream
    );

    localVideo.classList.remove(
        "cx-meeting-local-video--screen"
    );

    localVideo.hidden = false;

    if (context.elements.videoPlaceholder) {
        context.elements.videoPlaceholder.classList.add(
            "cx-meeting-video-placeholder--hidden"
        );
    }

    updateLocalVideoVisibility();


    const videoTrack = getVideoTrack();


    if (

        videoTrack

        &&

        context.isVideoEnabled

        &&

        !context.forcedVideoDisabled

    ) {


        try {

            const playPromise = localVideo.play();

            if (playPromise) {

                playPromise.catch(
                    (error) => {

                        console.warn(
                            "ConnectX local camera playback blocked:",
                            error
                        );

                    }
                );

            }

        } catch (error) {

            console.warn(
                "ConnectX local camera playback failed:",
                error
            );

        }

    }

}


/* ==========================================================
   SHOW SCREEN STREAM
========================================================== */


async function showScreenStream() {

    const context = getMeetingContext();


    const localVideo = (
        context.elements.localVideo
    );


    const videoPlaceholder = (
        context.elements.videoPlaceholder
    );


    if (!localVideo) {

        return;

    }


    if (!context.screenStream) {

        return;

    }


    localVideo.srcObject = (
        context.screenStream
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


    try {

        await localVideo.play();

    } catch (error) {

        console.warn(

            "ConnectX screen playback blocked:",

            error

        );

    }

}


/* ==========================================================
   INITIALIZE MICROPHONE
========================================================== */


async function initializeMicrophone() {

    const context = getMeetingContext();


    try {

        const audioStream = (

            await navigator
                .mediaDevices
                .getUserMedia({

                    audio: true,

                    video: false,

                })

                

        );


        const audioTrack = (

            audioStream
                .getAudioTracks()[0]

        );


        if (!audioTrack) {

            audioStream
                .getTracks()
                .forEach(
                    (track) => {

                        track.stop();

                    }
                );


            console.warn(
                "ConnectX microphone track was not found."
            );


            context.isMuted = true;


            return null;

        }


        audioTrack.enabled = (

            !context.isMuted

            &&

            !context.forcedMuted

        );


        console.log(
            "ConnectX microphone available."
        );


        return audioTrack;

    } catch (error) {

        console.warn(

            "ConnectX microphone unavailable:",

            error

        );


        context.isMuted = true;


        return null;

    }

}


/* ==========================================================
   INITIALIZE CAMERA
========================================================== */


async function initializeCamera() {

    const context = getMeetingContext();


    try {

        const videoStream = (

            await navigator
                .mediaDevices
                .getUserMedia({

                    audio: false,

                    video: true,

                })

        );


        const videoTrack = (

            videoStream
                .getVideoTracks()[0]

        );


        if (!videoTrack) {

            videoStream
                .getTracks()
                .forEach(
                    (track) => {

                        track.stop();

                    }
                );


            console.warn(
                "ConnectX camera track was not found."
            );


            context.isVideoEnabled = false;


            return null;

        }


        videoTrack.enabled = (

            context.isVideoEnabled

            &&

            !context.forcedVideoDisabled

        );


        console.log(
            "ConnectX camera available."
        );


        return videoTrack;

    } catch (error) {

        console.warn(

            "ConnectX camera unavailable:",

            error

        );


        context.isVideoEnabled = false;


        return null;

    }

}



/* ==========================================================
   RECOVER CAMERA
========================================================== */

async function recoverCamera() {

    const context = getMeetingContext();

    if (cameraRecoveryInProgress) {

        return false;

    }

    cameraRecoveryInProgress = true;

    try {

        console.log(
            "ConnectX camera recovery started."
        );

        const videoStream =
            await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true,
            });

        const newVideoTrack =
            videoStream.getVideoTracks()[0];

        if (!newVideoTrack) {

            videoStream
                .getTracks()
                .forEach(
                    (track) => {
                        track.stop();
                    }
                );

            console.warn(
                "ConnectX camera recovery failed: no video track."
            );

            return false;

        }

        newVideoTrack.enabled = (
            context.isVideoEnabled
            &&
            !context.forcedVideoDisabled
        );

        /*
         * Remove the old dead camera track.
         */

        const oldVideoTrack =
            getVideoTrack();

        if (oldVideoTrack) {

            context.localStream.removeTrack(
                oldVideoTrack
            );

            oldVideoTrack.stop();

        }

        /*
         * Add the new camera track.
         */

        context.localStream.addTrack(
            newVideoTrack
        );

        context.isVideoEnabled = true;

        /*
         * Reconnect the new camera track to
         * every existing WebRTC peer.
         *
         * We will use the existing WebRTC
         * replacement mechanism.
         */

        const {
            replaceOutgoingVideoTrack
        } = await import(
            "./webrtc.js"
        );

        await replaceOutgoingVideoTrack(
            newVideoTrack
        );

        /*
         * Restore local video.
         */

        await showCameraStream();

        updateLocalVideoVisibility();

        console.log(
            "ConnectX camera recovery completed:",
            {
                trackId:
                    newVideoTrack.id,
                readyState:
                    newVideoTrack.readyState,
                enabled:
                    newVideoTrack.enabled,
            }
        );

        return true;

    } catch (error) {

        console.warn(
            "ConnectX camera recovery unavailable:",
            error
        );

        context.isVideoEnabled = false;

        updateLocalVideoVisibility();

        return false;

    } finally {

        cameraRecoveryInProgress = false;

    }

}



/* ==========================================================
   MONITOR CAMERA TRACK
========================================================== */

function monitorCameraTrack(
    videoTrack
) {

    if (!videoTrack) {

        return;

    }

    videoTrack.addEventListener(
        "ended",
        () => {

            console.warn(
                "ConnectX camera track ended."
            );

            updateLocalVideoVisibility();

            /*
             * Give the browser/device a moment
             * before attempting recovery.
             */

            window.setTimeout(
                () => {

                    recoverCamera();

                },
                500
            );

        }
    );

}



/* ==========================================================
   MONITOR CAMERA DEVICE CHANGES
========================================================== */

function startCameraDeviceMonitoring() {

    if (
        !navigator.mediaDevices
        ||
        !navigator.mediaDevices.addEventListener
    ) {

        return;

    }

    if (cameraDeviceChangeHandler) {

        return;

    }

    cameraDeviceChangeHandler =
        () => {

            const context =
                getMeetingContext();

            const currentTrack =
                getVideoTrack();

            /*
             * If a live camera already exists,
             * nothing needs to be recovered.
             */

            if (
                currentTrack
                &&
                currentTrack.readyState === "live"
            ) {

                return;

            }

            console.log(
                "ConnectX camera device change detected."
            );

            recoverCamera();

        };

    navigator.mediaDevices.addEventListener(
        "devicechange",
        cameraDeviceChangeHandler
    );

}




/* ==========================================================
   INITIALIZE LOCAL MEDIA
========================================================== */


async function initializeLocalMedia() {

    console.log(
        "ConnectX initializeLocalMedia START"
    );

    const context = getMeetingContext();

    console.log(
        "ConnectX requesting camera and microphone"
    );


    if (

        !navigator.mediaDevices

        ||

        !navigator.mediaDevices.getUserMedia

    ) {

        console.warn(
            "ConnectX media devices are not supported."
        );


        context.isMuted = true;

        context.isVideoEnabled = false;

        context.localStream = (
            new MediaStream()
        );


        updateLocalVideoVisibility();


        return context.localStream;

    }


    /*
     * Create the authoritative local stream
     * before device acquisition.
     *
     * Media helpers and control synchronization
     * always read from context.localStream.
     */


    context.localStream = (
        new MediaStream()
    );


    /*
     * Microphone and camera are intentionally
     * initialized independently.
     *
     * Each available track is attached to the
     * authoritative local stream immediately.
     */


    const microphonePromise = (

        initializeMicrophone()
            .then(
                (audioTrack) => {

                    console.log(
                        "ConnectX microphone initialization completed:",
                        {
                            available: Boolean(audioTrack),
                        }
                    );

                    if (audioTrack) {

                        context.localStream.addTrack(
                            audioTrack
                        );

                    }


                    return audioTrack;

                }
            )

    );


    const cameraPromise = (

        initializeCamera()
            .then(
                (videoTrack) => {

                    console.log(
                        "ConnectX camera initialization completed:",
                        {
                            available: Boolean(videoTrack),
                        }
                    );

                    if (videoTrack) {

                        context.localStream.addTrack(
                            videoTrack
                        );

                        monitorCameraTrack(
                            videoTrack
                        );

                    }


                    return videoTrack;

                }
            )

    );


    await Promise.allSettled([

        microphonePromise,

        cameraPromise,

    ]);


    console.log(
        "ConnectX media acquisition promises completed:",
        {
            audioTracks:
                context.localStream
                    .getAudioTracks()
                    .length,

            videoTracks:
                context.localStream
                    .getVideoTracks()
                    .length,
        }
    );


    await showCameraStream();


    console.log(
        "ConnectX local media initialized:",

        {

            audioTracks: (

                context
                    .localStream
                    .getAudioTracks()
                    .length

            ),

            videoTracks: (

                context
                    .localStream
                    .getVideoTracks()
                    .length

            ),

        }

    );


    return context.localStream;

    startCameraDeviceMonitoring();

}


/* ==========================================================
   SET MICROPHONE ENABLED STATE
========================================================== */


function setMicrophoneEnabled(
    enabled
) {

    const context = getMeetingContext();


    const audioTrack = getAudioTrack();


    if (!audioTrack) {

        return false;

    }


    if (context.forcedMuted) {

        audioTrack.enabled = false;


        return false;

    }


    audioTrack.enabled = Boolean(
        enabled
    );


    return audioTrack.enabled;

}


/* ==========================================================
   SET CAMERA ENABLED STATE
========================================================== */


function setCameraEnabled(
    enabled
) {

    const context = getMeetingContext();


    const videoTrack = getVideoTrack();


    if (!videoTrack) {

        updateLocalVideoVisibility();


        return false;

    }


    if (context.forcedVideoDisabled) {

        videoTrack.enabled = false;


        updateLocalVideoVisibility();


        return false;

    }


    videoTrack.enabled = Boolean(
        enabled
    );


    updateLocalVideoVisibility();


    return videoTrack.enabled;

}


/* ==========================================================
   STOP MEDIA STREAM
========================================================== */


function stopMediaStream(
    stream
) {

    if (!stream) {

        return;

    }


    stream
        .getTracks()
        .forEach(
            (track) => {

                track.stop();

            }
        );

}


/* ==========================================================
   CLEANUP LOCAL MEDIA
========================================================== */


function cleanupLocalMedia() {

    const context = getMeetingContext();


    stopMediaStream(
        context.localStream
    );


    stopMediaStream(
        context.screenStream
    );


    context.localStream = null;

    context.screenStream = null;

    context.isScreenSharing = false;


    const localVideo = (
        context.elements.localVideo
    );


    if (localVideo) {

        localVideo.pause();

        localVideo.srcObject = null;

    }


    console.log(
        "ConnectX local media cleaned."
    );

}



/* ==========================================================
   STOP LOCAL MEDIA
========================================================== */


function stopLocalMedia() {

    const context = getMeetingContext();


    stopMediaStream(
        context.localStream
    );


    stopMediaStream(
        context.screenStream
    );


    context.localStream = null;

    context.screenStream = null;

    context.isScreenSharing = false;


    const localVideo = (
        context.elements.localVideo
    );


    if (localVideo) {

        localVideo.pause();

        localVideo.srcObject = null;

    }


    console.log(
        "ConnectX local media stopped."
    );

}



/* ==========================================================
   EXPORTS
========================================================== */


export {

    initializeLocalMedia,

    getAudioTrack,

    getVideoTrack,

    getScreenTrack,

    setMicrophoneEnabled,

    setCameraEnabled,

    updateLocalVideoVisibility,

    showCameraStream,

    showScreenStream,

    stopMediaStream,

    cleanupLocalMedia,

    stopLocalMedia,

    recoverCamera,

};