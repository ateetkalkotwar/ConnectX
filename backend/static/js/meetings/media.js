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

            await localVideo.play();

        } catch (error) {

            console.warn(

                "ConnectX local camera playback blocked:",

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
   INITIALIZE LOCAL MEDIA
========================================================== */


async function initializeLocalMedia() {

    const context = getMeetingContext();


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

                    if (videoTrack) {

                        context.localStream.addTrack(
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

};