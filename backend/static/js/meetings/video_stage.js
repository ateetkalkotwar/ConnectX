/* ==========================================================
   CONNECTX VIDEO STAGE

   Responsibility:
   - Video tile rendering
   - Remote tile creation
   - Video visibility
   - Active stage management
   - Thumbnail strip
   - Screen share rendering

   This module does NOT:
   - Create RTCPeerConnection
   - Access camera devices
   - Create WebSockets
========================================================== */

import {
    getMeetingContext,
} from "./meeting_context.js";


/* ==========================================================
   RUNTIME
========================================================== */

const runtime = {

    initialized: false,

    stage: null,

    thumbnailStrip: null,

    videoGrid: null,

    activeParticipantId: null,

    activeScreenShareUserId: null,

    pinnedParticipantId: null,

    autoSwitchSpeaker: true,


};


/* ==========================================================
   AUDIO ANALYZER RUNTIME
========================================================== */

const audioAnalyzers = new Map();

const speakingParticipants = new Set();

let activeSpeakerAnimationFrame = null;

const SPEAKING_THRESHOLD = 22;

const SPEAKING_HOLD_TIME = 300;

const AUDIO_FFT_SIZE = 512;



/* ==========================================================
   INITIALIZE VIDEO STAGE
========================================================== */

function initializeVideoStage() {

    if (runtime.initialized) {

        return;

    }

    const context = getMeetingContext();

    runtime.videoGrid = context.elements.videoGrid;

    if (!runtime.videoGrid) {

        throw new Error(
            "ConnectX video grid was not found."
        );

    }

    createVideoStage();

    /*
     * Bind local participant tile.
     */

    const localTile = runtime.videoGrid.querySelector(
        `[data-video-participant-id="${context.currentUserId}"]`
    );

    if (localTile) {

        bindTileEvents(
            localTile,
            context.currentUserId
        );

        runtime.activeParticipantId =
            context.currentUserId;

    }

    runtime.initialized = true;

    console.log(
        "ConnectX Video Stage initialized."
    );

}


/* ==========================================================
   CREATE VIDEO STAGE
========================================================== */

function createVideoStage() {

    const parent = runtime.videoGrid.parentElement;

    if (!parent) {

        throw new Error(
            "ConnectX video container not found."
        );

    }

    /*
     * Stage container
     */

    let stage = parent.querySelector(
        "[data-active-video-stage]"
    );

    if (!stage) {

        stage = document.createElement(
            "section"
        );

        stage.className =
            "cx-video-stage";

        stage.dataset.activeVideoStage = "";

        parent.insertBefore(
            stage,
            runtime.videoGrid
        );

    }

    runtime.stage = stage;

    /*
     * Thumbnail strip
     */

    let strip = parent.querySelector(
        "[data-video-thumbnail-strip]"
    );

    if (!strip) {

        strip = document.createElement(
            "section"
        );

        strip.className =
            "cx-video-thumbnail-strip";

        strip.dataset.videoThumbnailStrip = "";

        parent.appendChild(
            strip
        );

    }

    runtime.thumbnailStrip = strip;

    /*
     * Move grid into strip only once.
     */

    if (

        runtime.videoGrid.parentElement !==
        strip

    ) {

        strip.appendChild(
            runtime.videoGrid
        );

    }

}



/* ==========================================================
   ENSURE STAGE VIDEO ELEMENT
========================================================== */

function ensureStageVideoElement() {

    if (!runtime.stage) {

        return null;

    }

    let stageContainer = runtime.stage.querySelector(
        ".cx-video-stage-container"
    );

    if (!stageContainer) {

        stageContainer = document.createElement(
            "div"
        );

        stageContainer.className =
            "cx-video-stage-container";

        runtime.stage.appendChild(
            stageContainer
        );

    }

    let stageVideo = stageContainer.querySelector(
        "[data-stage-video]"
    );

    if (!stageVideo) {

        stageVideo = createVideoElement(false);

        stageVideo.dataset.stageVideo = "";

        stageVideo.classList.add(
            "cx-video-stage-video"
        );

        stageContainer.appendChild(
            stageVideo
        );

    }

    let placeholder = stageContainer.querySelector(
        "[data-stage-placeholder]"
    );

    if (!placeholder) {

        placeholder = document.createElement(
            "div"
        );

        placeholder.className =
            "cx-video-stage-placeholder";

        placeholder.dataset.stagePlaceholder =
            "";

        stageContainer.appendChild(
            placeholder
        );

    }

    let meta = stageContainer.querySelector(
        "[data-stage-meta]"
    );

    if (!meta) {

        meta = document.createElement(
            "div"
        );

        meta.className =
            "cx-video-stage-meta";

        meta.dataset.stageMeta = "";

        stageContainer.appendChild(
            meta
        );

    }

    return {

        container: stageContainer,

        video: stageVideo,

        placeholder,

        meta,

    };

}


/* ==========================================================
   GET VIDEO TILE
========================================================== */

function getVideoTile(userId) {

    if (!runtime.videoGrid) {

        return null;

    }

    const participantId = Number(userId);

    if (!Number.isFinite(participantId)) {

        return null;

    }

    return runtime.videoGrid.querySelector(

        `[data-video-participant-id="${participantId}"]`

    );

}


/* ==========================================================
   CREATE VIDEO ELEMENT
========================================================== */

function createVideoElement(
    isLocal = false
) {

    const video = document.createElement(
        "video"
    );

    video.className =
        "cx-meeting-video";

    video.autoplay = true;

    video.playsInline = true;

    video.preload = "metadata";

    video.disablePictureInPicture = true;

    video.controls = false;

    video.controlsList =
        "nodownload noplaybackrate nofullscreen";

    video.setAttribute(
        "webkit-playsinline",
        "true"
    );

    video.setAttribute(
        "playsinline",
        "true"
    );

    video.dataset.videoElement = "";

    if (isLocal) {

        video.dataset.localVideo = "";

        video.muted = true;

    }

    else {

        video.dataset.remoteVideo = "";

        video.muted = false;

    }

    video.addEventListener(

        "loadedmetadata",

        () => {

            video.play()

                .catch((error) => {

                    console.warn(

                        "ConnectX autoplay prevented:",

                        error

                    );

                });

        }

    );

    video.addEventListener(

        "emptied",

        () => {

            video.pause();

        }

    );

    return video;

}


/* ==========================================================
   CREATE PLACEHOLDER
========================================================== */

function createPlaceholder(
    username,
    isLocal = false
) {

    const resolvedUsername =

        (
            username ||
            "Participant"
        ).trim();

    const placeholder =

        document.createElement(
            "div"
        );

    placeholder.className =
        "cx-meeting-video-placeholder";

    placeholder.dataset.placeholder = "";

    if (isLocal) {

        placeholder.dataset.videoPlaceholder = "";

    }

    else {

        placeholder.dataset.remoteVideoPlaceholder = "";

    }

    /*
     * Avatar
     */

    const avatar =

        document.createElement(
            "div"
        );

    avatar.className =
        "cx-video-avatar";

    avatar.textContent =

        resolvedUsername
            .charAt(0)
            .toUpperCase();

    /*
     * Participant Name
     */

    const name =

        document.createElement(
            "span"
        );

    name.className =
        "cx-video-placeholder-name";

    name.textContent =
        resolvedUsername;

    /*
     * Camera Status
     */

    const status =

        document.createElement(
            "small"
        );

    status.className =
        "cx-video-placeholder-status";

    status.textContent =
        "Camera Off";

    placeholder.appendChild(
        avatar
    );

    placeholder.appendChild(
        name
    );

    placeholder.appendChild(
        status
    );

    return placeholder;

}


/* ==========================================================
   CREATE META BAR
========================================================== */

function createMetaBar(
    username,
    options = {}
) {

    const {

        isHost = false,

        isLocal = false,

        isMuted = false,

        isVideoEnabled = true,

        isScreenSharing = false,

    } = options;

    const meta = document.createElement(
        "div"
    );

    meta.className =
        "cx-meeting-video-meta";

    /*
     * Participant information
     */

    const participantInfo =
        document.createElement(
            "div"
        );

    participantInfo.className =
        "cx-video-meta-info";

    const participantName =
        document.createElement(
            "span"
        );

    participantName.className =
        "cx-video-meta-name";

    participantName.textContent =
        username || "Participant";

    participantInfo.appendChild(
        participantName
    );

    if (isLocal) {

        const youBadge =
            document.createElement(
                "small"
            );

        youBadge.className =
            "cx-video-meta-badge";

        youBadge.textContent =
            "You";

        participantInfo.appendChild(
            youBadge
        );

    }

    if (isHost) {

        const hostBadge =
            document.createElement(
                "small"
            );

        hostBadge.className =
            "cx-video-meta-badge";

        hostBadge.textContent =
            "Host";

        participantInfo.appendChild(
            hostBadge
        );

    }

    /*
     * Status Icons
     */

    const statusContainer =
        document.createElement(
            "div"
        );

    statusContainer.className =
        "cx-video-meta-status";

    if (isMuted) {

        const mutedIcon =
            document.createElement(
                "span"
            );

        mutedIcon.className =
            "cx-status-icon";

        mutedIcon.dataset.status =
            "muted";

        mutedIcon.title =
            "Microphone Off";

        mutedIcon.textContent = "🎤";

        statusContainer.appendChild(
            mutedIcon
        );

    }

    if (!isVideoEnabled) {

        const cameraIcon =
            document.createElement(
                "span"
            );

        cameraIcon.className =
            "cx-status-icon";

        cameraIcon.dataset.status =
            "camera-off";

        cameraIcon.title =
            "Camera Off";

        cameraIcon.textContent = "📷";

        statusContainer.appendChild(
            cameraIcon
        );

    }

    if (isScreenSharing) {

        const screenIcon =
            document.createElement(
                "span"
            );

        screenIcon.className =
            "cx-status-icon";

        screenIcon.dataset.status =
            "screen-share";

        screenIcon.title =
            "Presenting";

        screenIcon.textContent = "🖥️";

        statusContainer.appendChild(
            screenIcon
        );

    }

    meta.appendChild(
        participantInfo
    );

    meta.appendChild(
        statusContainer
    );

    return meta;

}


/* ==========================================================
   CREATE REMOTE VIDEO TILE
========================================================== */

function createRemoteVideoTile(
    userId,
    username
) {

    if (!runtime.initialized) {

        initializeVideoStage();

    }

    const context = getMeetingContext();

    const participantId = Number(userId);

    /*
     * Prevent duplicate tiles.
     */

    const existingTile = getVideoTile(
        participantId
    );

    if (existingTile) {

        return existingTile;

    }

    const tile = document.createElement(
        "article"
    );

    tile.className =
        "cx-meeting-video-tile";

    tile.dataset.videoParticipantId =
        String(participantId);

    /*
     * Local participant flag
     */

    const isLocal =

        participantId ===
        context.currentUserId;

    if (isLocal) {

        tile.dataset.localParticipant = "";

    }

    /*
     * Video
     */

    const video = createVideoElement(
        isLocal
    );

    tile.appendChild(video);

    /*
     * Placeholder
     */

    tile.appendChild(

        createPlaceholder(

            username,

            isLocal

        )

    );

    /*
     * Meta bar
     */

    tile.appendChild(

        createMetaBar(

            username,

            {

                isLocal,

                isHost: false,

                isMuted: false,

                isVideoEnabled: true,

                isScreenSharing: false,

            }

        )

    );

    /*
     * Pin Button
     */

    const pinButton =

        document.createElement(
            "button"
        );

    pinButton.type = "button";

    pinButton.className =
        "cx-video-pin-button";

    pinButton.dataset.videoPin = "";

    pinButton.title =
        "Pin Participant";

    pinButton.innerHTML =
        "📌";

    tile.appendChild(
        pinButton
    );

    /*
     * Store participant id.
     */

    tile.dataset.participantId =
        String(participantId);

    /*
     * Bind events.
     */

    bindTileEvents(

        tile,

        participantId

    );

    /*
     * Add to thumbnail strip.
     */

    runtime.videoGrid.appendChild(
        tile
    );

    /*
     * Make first participant active.
     */

    if (

        runtime.activeParticipantId
        ===
        null

    ) {

        setActiveParticipant(
            participantId
        );

    }

    console.log(

        "ConnectX participant tile created:",

        {

            userId:
                participantId,

            username:
                username,

        }

    );

    return tile;

}


/* ==========================================================
   BIND TILE EVENTS
========================================================== */

function bindTileEvents(
    tile,
    userId
) {

    if (!tile) {

        return;

    }

    const participantId = Number(userId);

    /*
     * Prevent duplicate event binding.
     */

    if (tile.dataset.eventsBound === "true") {

        return;

    }

    tile.dataset.eventsBound = "true";

    /*
     * Single click
     * ----------
     * Make participant active.
     */

    tile.addEventListener(

        "click",

        () => {

            setActiveParticipant(
                participantId
            );

        }

    );

    /*
     * Double click
     * ------------
     * Reserved for future fullscreen.
     */

    tile.addEventListener(

        "dblclick",

        () => {

            console.log(

                "ConnectX fullscreen reserved:",

                participantId

            );

        }

    );

    /*
     * Pin button support.
     *
     * Will automatically work once
     * pin button is added later.
     */

    const pinButton = tile.querySelector(

        "[data-video-pin]"

    );

    if (pinButton) {

        pinButton.addEventListener(

            "click",

            (event) => {

                event.stopPropagation();

                pinParticipant(
                    participantId
                );

            }

        );

    }

}



/* ==========================================================
   ATTACH REMOTE STREAM
========================================================== */

function attachRemoteStream(
    userId,
    username,
    stream
) {

    if (!stream) {

        console.warn(
            "ConnectX remote stream is missing."
        );

        return;

    }

    if (!runtime.initialized) {

        initializeVideoStage();

    }

    const context = getMeetingContext();

    const participantId = Number(userId);

    /*
     * Store latest stream.
     */

    context.remoteStreams.set(

        participantId,

        stream

    );

    /*
     * Create tile if necessary.
     */

    const tile = createRemoteVideoTile(

        participantId,

        username

    );

    if (!tile) {

        console.warn(

            "Unable to create remote tile:",

            participantId

        );

        return;

    }

    /*
     * Locate video element.
     */

    const video = tile.querySelector(

        "[data-remote-video]"

    );

    if (!video) {

        console.warn(

            "Remote video element missing:",

            participantId

        );

        return;

    }

    /*
     * Prevent unnecessary assignments.
     */

    if (

        video.srcObject !== stream

    ) {

        video.srcObject = stream;

    }

    /*
     * Start speaking detector.
     */

    startAudioAnalyzer(

        participantId,

        stream

    );

    /*
     * Update camera state.
     */

    updateRemoteVideoVisibility(

        participantId

    );

    /*
     * Attempt autoplay.
     */

    video.play()

        .catch(

            (error) => {

                console.warn(

                    "Autoplay blocked:",

                    error

                );

            }

        );

    /*
     * If no participant is active,
     * make this participant active.
     */

    if (

        runtime.activeParticipantId
        ===
        null

    ) {

        setActiveParticipant(

            participantId

        );

    }

    console.log(

        "ConnectX remote stream attached:",

        {

            userId:

                participantId,

            username,

        }

    );

}


/* ==========================================================
   UPDATE REMOTE VIDEO VISIBILITY
========================================================== */

function updateRemoteVideoVisibility(
    userId
) {

    const context = getMeetingContext();

    const participantId = Number(
        userId
    );

    const tile = getVideoTile(
        participantId
    );

    if (!tile) {

        return;

    }

    const stream = context.remoteStreams.get(
        participantId
    );

    if (!stream) {

        return;

    }

    const video = tile.querySelector(
        "[data-remote-video]"
    );

    const placeholder = tile.querySelector(
        "[data-remote-video-placeholder]"
    );

    if (!video) {

        return;

    }

    /*
     * Find current video track.
     */

    const videoTrack =

        stream.getVideoTracks()[0] ||

        null;

    const hasVideo =

        Boolean(videoTrack) &&

        videoTrack.readyState === "live" &&

        videoTrack.enabled &&

        !videoTrack.muted;

    /*
     * Show / Hide video.
     */

    video.hidden = !hasVideo;

    /*
     * Show / Hide placeholder.
     */

    if (placeholder) {

        placeholder.hidden = hasVideo;

        placeholder.classList.toggle(

            "cx-placeholder-hidden",

            hasVideo

        );

    }

    /*
     * Camera state.
     */

    tile.classList.toggle(

        "cx-camera-disabled",

        !hasVideo

    );

    /*
     * Keep stage synchronized.
     */

    if (

        runtime.activeParticipantId ===

        participantId

    ) {

        const stageVideo =

            runtime.stage?.querySelector(

                "[data-remote-video]"

            );

        if (

            stageVideo &&

            stageVideo !== video

        ) {

            stageVideo.srcObject =

                stream;

            stageVideo.hidden =

                !hasVideo;

        }

    }

    /*
     * Update when track state changes.
     */

    if (videoTrack) {

        const refresh = () => {

            updateRemoteVideoVisibility(

                participantId

            );

        };

        videoTrack.onmute = refresh;

        videoTrack.onunmute = refresh;

        videoTrack.onended = refresh;

    }

    console.log(

        "ConnectX participant visibility updated:",

        {

            participantId,

            hasVideo,

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

    const participantId = Number(
        userId
    );

    const tile = getVideoTile(
        participantId
    );

    if (!tile) {

        return;

    }

    /*
     * Stop speaking analyzer.
     */

    stopAudioAnalyzer(
        participantId
    );

    /*
     * Remove speaking state.
     */

    removeSpeakingHighlight(
        participantId
    );

    /*
     * Release media stream.
     */

    const video = tile.querySelector(
        "[data-remote-video]"
    );

    if (video) {

        try {

            video.pause();

        } catch (error) {}

        video.srcObject = null;

    }

    /*
     * Remove participant stream.
     */

    context.remoteStreams.delete(
        participantId
    );

    /*
     * Remove tile.
     */

    tile.remove();

    /*
     * Active participant left.
     */

    if (

        runtime.activeParticipantId ===
        participantId

    ) {

        runtime.activeParticipantId =
            null;

        const nextTile =

            runtime.videoGrid.querySelector(
                ".cx-meeting-video-tile"
            );

        if (nextTile) {

            const nextParticipantId = Number(

                nextTile.dataset
                    .videoParticipantId

            );

            setActiveParticipant(
                nextParticipantId
            );

        }

        else if (runtime.stage) {

            runtime.stage.replaceChildren();

        }

    }

    console.log(

        "ConnectX participant removed:",

        {

            participantId,

            remainingParticipants:

                runtime.videoGrid
                    .querySelectorAll(
                        ".cx-meeting-video-tile"
                    ).length,

        }

    );

}


/* ==========================================================
   SET ACTIVE PARTICIPANT
========================================================== */

function setActiveParticipant(
    userId
) {

    const context = getMeetingContext();

    const participantId = Number(
        userId
    );

    if (

        runtime.activeParticipantId ===
        participantId

    ) {

        return;

    }

    const tile = getVideoTile(
        participantId
    );

    if (!tile) {

        console.warn(

            "Active participant tile not found:",

            participantId

        );

        return;

    }

    const stage = ensureStageVideoElement();

    if (!stage) {

        return;

    }

    /*
     * Remove previous active state.
     */

    runtime.videoGrid
        .querySelectorAll(
            ".cx-meeting-video-tile"
        )
        .forEach(

            (element) => {

                element.classList.remove(

                    "cx-video-tile--active"

                );

            }

        );

    runtime.activeParticipantId =
        participantId;

    tile.classList.add(
        "cx-video-tile--active"
    );

    /*
     * Resolve media stream.
     */

    let stream = null;

    if (

        participantId ===
        context.currentUserId

    ) {

        stream = context.localStream;

    }

    else {

        stream = context.remoteStreams.get(
            participantId
        );

    }

    /*
     * Update stage video.
     */

    if (

        stage.video.srcObject !==
        stream

    ) {

        stage.video.srcObject =
            stream || null;

    }

    /*
     * Update placeholder.
     */

    const placeholder =
        tile.querySelector(

            ".cx-meeting-video-placeholder"

        );

    if (placeholder) {

        stage.placeholder.innerHTML =
            placeholder.innerHTML;

    }

    /*
     * Update participant information.
     */

    const meta =
        tile.querySelector(

            ".cx-meeting-video-meta"

        );

    if (meta) {

        stage.meta.innerHTML =
            meta.innerHTML;

    }

    /*
     * Determine camera state.
     */

    let hasVideo = false;

    if (stream) {

        const track =

            stream.getVideoTracks()[0];

        hasVideo =

            Boolean(track) &&

            track.readyState === "live" &&

            track.enabled &&

            !track.muted;

    }

    stage.video.hidden =
        !hasVideo;

    stage.placeholder.hidden =
        hasVideo;

    /*
     * Attempt playback.
     */

    if (hasVideo) {

        stage.video.play()

            .catch(

                (error) => {

                    console.warn(

                        "Stage autoplay blocked:",

                        error

                    );

                }

            );

    }

    /*
     * Update speaking state.
     */

    runtime.stage.classList.toggle(

        "cx-stage-speaking",

        speakingParticipants.has(
            participantId
        )

    );

    console.log(

        "ConnectX active participant updated:",

        {

            participantId,

            hasVideo,

        }

    );

}



/* ==========================================================
   PIN PARTICIPANT
========================================================== */

function pinParticipant(
    userId
) {

    const participantId = Number(
        userId
    );

    /*
     * Clicking the pinned participant again
     * removes the pin.
     */

    if (

        runtime.pinnedParticipantId ===
        participantId

    ) {

        unpinParticipant();

        return;

    }

    runtime.pinnedParticipantId =
        participantId;

    runtime.autoSwitchSpeaker =
        false;

    runtime.videoGrid
        .querySelectorAll(
            ".cx-meeting-video-tile"
        )
        .forEach(

            (tile) => {

                tile.classList.remove(
                    "cx-video-tile--pinned"
                );

            }

        );

    const tile =
        getVideoTile(
            participantId
        );

    if (tile) {

        tile.classList.add(
            "cx-video-tile--pinned"
        );

    }

    setActiveParticipant(
        participantId
    );

    console.log(

        "ConnectX participant pinned:",

        participantId

    );

}


/* ==========================================================
   UNPIN PARTICIPANT
========================================================== */

function unpinParticipant() {

    runtime.videoGrid
        .querySelectorAll(
            ".cx-video-tile--pinned"
        )
        .forEach(

            (tile) => {

                tile.classList.remove(
                    "cx-video-tile--pinned"
                );

            }

        );

    runtime.pinnedParticipantId =
        null;

    runtime.autoSwitchSpeaker =
        true;

    console.log(
        "ConnectX participant unpinned."
    );

}



/* ==========================================================
   CLEAR ACTIVE STAGE
========================================================== */

function clearActiveStage() {

    const stage = ensureStageVideoElement();

    if (!stage) {

        return;

    }

    try {

        stage.video.pause();

    }

    catch (error) {}

    stage.video.srcObject = null;

    stage.video.hidden = true;

    stage.placeholder.hidden = false;

    stage.placeholder.innerHTML = "";

    stage.meta.innerHTML = "";

    runtime.stage.classList.remove(

        "cx-stage-speaking"

    );

    runtime.activeParticipantId = null;

}


/* ==========================================================
   RESET VIDEO STAGE
========================================================== */

function resetVideoStage() {

    runtime.pinnedParticipantId = null;

    runtime.activeScreenShareUserId = null;

    runtime.autoSwitchSpeaker = true;

    runtime.videoGrid
        .querySelectorAll(

            ".cx-video-tile--active, \
             .cx-video-tile--pinned, \
             .cx-participant-speaking"

        )

        .forEach(

            (tile) => {

                tile.classList.remove(

                    "cx-video-tile--active",

                    "cx-video-tile--pinned",

                    "cx-participant-speaking"

                );

            }

        );

    clearActiveStage();

}


/* ==========================================================
   START SCREEN SHARE STAGE
========================================================== */

function startScreenShareStage(
    userId,
    stream,
    username = "Participant"
) {

    const participantId = Number(
        userId
    );

    if (!stream) {

        return;

    }

    const stage = ensureStageVideoElement();

    if (!stage) {

        return;

    }

    runtime.activeScreenShareUserId =
        participantId;

    /*
     * Screen sharing has highest priority.
     */

    runtime.stage.classList.add(
        "cx-stage-screen-sharing"
    );

    /*
     * Display shared screen.
     */

    stage.video.srcObject = stream;

    stage.video.hidden = false;

    stage.placeholder.hidden = true;

    stage.meta.innerHTML = "";

    const title = document.createElement(
        "div"
    );

    title.className =
        "cx-stage-screen-share-title";

    title.textContent =
        `${username} is presenting`;

    stage.meta.appendChild(
        title
    );

    stage.video.play()

        .catch(() => {});

    console.log(

        "ConnectX screen sharing started:",

        participantId

    );

}



/* ==========================================================
   STOP SCREEN SHARE STAGE
========================================================== */

function stopScreenShareStage(
    userId
) {

    const participantId = Number(
        userId
    );

    if (

        runtime.activeScreenShareUserId !==
        participantId

    ) {

        return;

    }

    runtime.activeScreenShareUserId =
        null;

    runtime.stage.classList.remove(
        "cx-stage-screen-sharing"
    );

    /*
     * Restore stage.
     */

    if (

        runtime.pinnedParticipantId !==
        null

    ) {

        setActiveParticipant(

            runtime.pinnedParticipantId

        );

        return;

    }

    if (

        runtime.activeParticipantId !==
        null

    ) {

        setActiveParticipant(

            runtime.activeParticipantId

        );

        return;

    }

    clearActiveStage();

    console.log(

        "ConnectX screen sharing stopped."

    );

}



/* ==========================================================
   CLEANUP VIDEO STAGE
========================================================== */

function cleanupVideoStage() {

    /*
     * Stop speaker detection loop.
     */

    if (

        activeSpeakerAnimationFrame

    ) {

        cancelAnimationFrame(

            activeSpeakerAnimationFrame

        );

        activeSpeakerAnimationFrame =
            null;

    }

    /*
     * Stop every audio analyzer.
     */

    Array.from(

        audioAnalyzers.keys()

    ).forEach(

        (participantId) => {

            stopAudioAnalyzer(
                participantId
            );

        }

    );

    /*
     * Clear runtime collections.
     */

    audioAnalyzers.clear();

    speakingParticipants.clear();

    /*
     * Reset stage.
     */

    resetVideoStage();

    /*
     * Release stage video.
     */

    const stage =
        ensureStageVideoElement();

    if (stage) {

        try {

            stage.video.pause();

        }

        catch (error) {}

        stage.video.srcObject =
            null;

        stage.video.removeAttribute(
            "src"
        );

        stage.video.load();

    }

    /*
     * Remove participant tiles.
     */

    if (

        runtime.videoGrid

    ) {

        runtime.videoGrid
            .replaceChildren();

    }

    /*
     * Reset runtime.
     */

    runtime.initialized = false;

    runtime.stage = null;

    runtime.thumbnailStrip =
        null;

    runtime.videoGrid = null;

    runtime.activeParticipantId =
        null;

    runtime.activeScreenShareUserId =
        null;

    runtime.pinnedParticipantId =
        null;

    runtime.autoSwitchSpeaker =
        true;

    console.log(

        "ConnectX Video Stage cleaned."

    );

}



/* ==========================================================
   DETECT ACTIVE SPEAKERS
========================================================== */

function detectActiveSpeakers() {

    const now = performance.now();

    let loudestParticipant = null;

    let loudestVolume = 0;

    audioAnalyzers.forEach(

        (entry, participantId) => {

            entry.analyser.getByteFrequencyData(
                entry.data
            );

            let total = 0;

            for (

                let index = 0;

                index < entry.data.length;

                index++

            ) {

                total += entry.data[index];

            }

            const averageVolume =

                total /

                entry.data.length;

            if (

                averageVolume >=

                SPEAKING_THRESHOLD

            ) {

                entry.lastSpokeAt = now;

                if (

                    !speakingParticipants.has(
                        participantId
                    )

                ) {

                    speakingParticipants.add(
                        participantId
                    );

                    highlightSpeakingParticipant(
                        participantId
                    );

                }

                if (

                    averageVolume >

                    loudestVolume

                ) {

                    loudestVolume =
                        averageVolume;

                    loudestParticipant =
                        participantId;

                }

            }

            else {

                const elapsed =

                    now -

                    entry.lastSpokeAt;

                if (

                    elapsed >

                    SPEAKING_HOLD_TIME

                ) {

                    if (

                        speakingParticipants.has(
                            participantId
                        )

                    ) {

                        speakingParticipants.delete(
                            participantId
                        );

                        removeSpeakingHighlight(
                            participantId
                        );

                    }

                }

            }

        }

    );

    /*
     * Stage Priority
     *
     * 1. Screen Share
     * 2. Pinned Participant
     * 3. Loudest Speaker
     */

    if (

        runtime.activeScreenShareUserId ===
        null

    ) {

        if (

            runtime.pinnedParticipantId ===
            null

        ) {

            if (

                runtime.autoSwitchSpeaker

                &&

                loudestParticipant !== null

                &&

                runtime.activeParticipantId !==
                loudestParticipant

            ) {

                setActiveParticipant(

                    loudestParticipant

                );

            }

        }

    }

    activeSpeakerAnimationFrame =

        requestAnimationFrame(

            detectActiveSpeakers

        );

}



/* ==========================================================
   HIGHLIGHT SPEAKING PARTICIPANT
========================================================== */

function highlightSpeakingParticipant(
    userId
) {

    const participantId = Number(
        userId
    );

    const tile = getVideoTile(
        participantId
    );

    if (!tile) {

        return;

    }

    if (

        tile.classList.contains(
            "cx-participant-speaking"
        )

    ) {

        return;

    }

    tile.classList.add(
        "cx-participant-speaking"
    );

    /*
     * Keep stage synchronized.
     */

    if (

        runtime.activeParticipantId ===
        participantId

        &&

        runtime.stage

    ) {

        runtime.stage.classList.add(
            "cx-stage-speaking"
        );

    }

}


/* ==========================================================
   REMOVE SPEAKING HIGHLIGHT
========================================================== */

function removeSpeakingHighlight(
    userId
) {

    const participantId = Number(
        userId
    );

    const tile = getVideoTile(
        participantId
    );

    if (!tile) {

        return;

    }

    tile.classList.remove(
        "cx-participant-speaking"
    );

    if (

        runtime.activeParticipantId ===
        participantId

        &&

        runtime.stage

    ) {

        runtime.stage.classList.remove(
            "cx-stage-speaking"
        );

    }

}


/* ==========================================================
   START AUDIO ANALYZER
========================================================== */

function startAudioAnalyzer(
    userId,
    stream
) {

    const participantId = Number(
        userId
    );

    if (!stream) {

        return;

    }

    if (

        audioAnalyzers.has(
            participantId
        )

    ) {

        return;

    }

    const audioTrack =

        stream.getAudioTracks()[0];

    if (!audioTrack) {

        return;

    }

    try {

        const audioContext =

            new (

                window.AudioContext ||

                window.webkitAudioContext

            )();

        const source =

            audioContext.createMediaStreamSource(
                stream
            );

        const analyser =

            audioContext.createAnalyser();

        analyser.fftSize =
            AUDIO_FFT_SIZE;

        analyser.smoothingTimeConstant =
            0.85;

        source.connect(
            analyser
        );

        const data =

            new Uint8Array(

                analyser.frequencyBinCount

            );

        audioAnalyzers.set(

            participantId,

            {

                context: audioContext,

                source,

                analyser,

                data,

                lastSpokeAt: 0,

            }

        );

        startSpeakerDetection();

        console.log(

            "ConnectX audio analyzer started:",

            participantId

        );

    }

    catch (error) {

        console.warn(

            "Unable to start audio analyzer:",

            error

        );

    }

}



/* ==========================================================
   STOP AUDIO ANALYZER
========================================================== */

function stopAudioAnalyzer(
    userId
) {

    const participantId = Number(
        userId
    );

    const analyzer = audioAnalyzers.get(
        participantId
    );

    if (!analyzer) {

        return;

    }

    try {

        analyzer.source.disconnect();

    }

    catch (error) {

        // Ignore disconnect errors.

    }

    try {

        analyzer.context.close();

    }

    catch (error) {

        // Ignore close errors.

    }

    audioAnalyzers.delete(
        participantId
    );

    speakingParticipants.delete(
        participantId
    );

    removeSpeakingHighlight(
        participantId
    );

    /*
     * Stop animation loop if
     * there are no analyzers.
     */

    if (

        audioAnalyzers.size === 0
        &&

        activeSpeakerAnimationFrame

    ) {

        cancelAnimationFrame(

            activeSpeakerAnimationFrame

        );

        activeSpeakerAnimationFrame =
            null;

    }

    console.log(

        "ConnectX audio analyzer stopped:",

        participantId

    );

}



/* ==========================================================
   START DETECTOR
========================================================== */

function startSpeakerDetection() {

    if (

        activeSpeakerAnimationFrame

    ) {

        return;

    }

    detectActiveSpeakers();

}



/* ==========================================================
   EXPORTS
========================================================== */

export {

    initializeVideoStage,

    cleanupVideoStage,

    createRemoteVideoTile,

    removeRemoteVideoTile,

    attachRemoteStream,

    updateRemoteVideoVisibility,

    setActiveParticipant,

    pinParticipant,

    unpinParticipant,

    startScreenShareStage,

    stopScreenShareStage,

};