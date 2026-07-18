/* ==========================================================
   CONNECTX MEETING ROOM

   Application entry point.

   Responsibility:
   - Initialize meeting context
   - Initialize participant UI
   - Initialize meeting controls
   - Initialize screen sharing
   - Initialize moderation
   - Initialize local media
   - Connect meeting WebSocket
   - Connect signaling WebSocket
   - Coordinate meeting room startup
   - Coordinate meeting room shutdown

   This module does NOT:
   - Implement WebRTC internals
   - Implement signaling transport internals
   - Implement participant rendering internals
   - Implement moderation HTTP internals
========================================================== */


import {
    initializeVideoStage,
} from "./video_stage.js";


import {
    initializeMeetingContext,
    getMeetingContext,
} from "./meeting_context.js";


import {
    initializeParticipants,
} from "./participants.js";


import {
    initializeMeetingControls,
    synchronizeLocalControlState,
} from "./controls.js";


import {
    initializeScreenShare,
} from "./screen_share.js";


import {
    initializeModeration,
} from "./moderation.js";


import {
    initializeLocalMedia,
    cleanupLocalMedia,
} from "./media.js";


import {
    connectMeetingSocket,
    disconnectMeetingSocket,
} from "./meeting_socket.js";


import {
    connectSignalingSocket,
    closeSignalingSocket,
} from "./signaling.js";


import {
    cleanupAllPeers,
} from "./webrtc.js";


/* ==========================================================
   APPLICATION RUNTIME
========================================================== */


let meetingRoomInitialized = false;

let meetingRoomShuttingDown = false;


/* ==========================================================
   INITIALIZE MEETING ROOM
========================================================== */


async function initializeMeetingRoom() {

    if (meetingRoomInitialized) {

        console.warn(
            "ConnectX meeting room is already initialized."
        );


        return;

    }


    meetingRoomInitialized = true;


    try {

        /*
         * Context must be initialized first.
         *
         * Every other meeting module depends
         * on the shared meeting context.
         */


        initializeMeetingContext();


        const context = getMeetingContext();


        console.log(

            "ConnectX meeting context initialized:",

            {

                meetingCode: (
                    context.meetingCode
                ),

                currentUserId: (
                    context.currentUserId
                ),

                currentUsername: (
                    context.currentUsername
                ),

            }

        );


        /*
         * Initialize DOM-driven modules before
         * opening real-time connections.
         */


        initializeParticipants();
        

        initializeVideoStage();


        initializeMeetingControls();


        initializeScreenShare();


        initializeModeration();


        /*
         * Synchronize the initial control state.
         *
         * At this point local media may not yet
         * exist. Controls will be synchronized
         * again after media acquisition.
         */


        synchronizeLocalControlState();


        /*
         * Initialize local media.
         *
         * Camera and microphone failures must
         * not stop the meeting application.
         *
         * Participant synchronization,
         * signaling and other available
         * capabilities must continue.
         */


        try {

            await initializeLocalMedia();


            /*
             * Local media acquisition has
             * completed.
             *
             * Re-synchronize meeting controls
             * so microphone and camera
             * availability use the actual
             * MediaStream tracks.
             */


            synchronizeLocalControlState();

        } catch (error) {

            console.warn(

                "ConnectX local media initialization failed:",

                error

            );


            /*
             * Synchronize controls after media
             * failure so unavailable devices
             * are represented correctly.
             */


            synchronizeLocalControlState();

        }


        /*
         * Meeting state WebSocket.
         *
         * Responsible for:
         *
         * - participant lifecycle
         * - participant state
         * - moderation events
         */


        connectMeetingSocket();


        /*
         * WebRTC signaling WebSocket.
         *
         * Local media initialization is
         * attempted before signaling starts.
         */


        connectSignalingSocket();


        console.log(
            "ConnectX meeting room initialized successfully."
        );

    } catch (error) {

        meetingRoomInitialized = false;


        console.error(

            "ConnectX meeting room initialization failed:",

            error

        );


        throw error;

    }

}


/* ==========================================================
   SHUTDOWN MEETING ROOM
========================================================== */


function shutdownMeetingRoom() {

    if (meetingRoomShuttingDown) {

        return;

    }


    meetingRoomShuttingDown = true;


    console.log(
        "ConnectX meeting room shutdown started."
    );


    /*
     * Stop WebSocket reconnection first.
     */


    disconnectMeetingSocket();


    closeSignalingSocket();


    /*
     * Close every WebRTC peer connection.
     */


    cleanupAllPeers();


    /*
     * Stop:
     *
     * - microphone tracks
     * - camera tracks
     * - screen-share tracks
     *
     * Also clear local video rendering.
     */


    cleanupLocalMedia();


    console.log(
        "ConnectX meeting room shutdown completed."
    );

}


/* ==========================================================
   DOM READY
========================================================== */


function handleDocumentReady() {

    initializeMeetingRoom().catch(

        (error) => {

            console.error(

                "ConnectX meeting room startup error:",

                error

            );

        }

    );

}


/* ==========================================================
   PAGE LIFECYCLE
========================================================== */


window.addEventListener(

    "pagehide",

    () => {

        shutdownMeetingRoom();

    }

);


/* ==========================================================
   START APPLICATION
========================================================== */


if (
    document.readyState === "loading"
) {

    document.addEventListener(

        "DOMContentLoaded",

        handleDocumentReady,

        {
            once: true,
        }

    );

} else {

    handleDocumentReady();

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    initializeMeetingRoom,

    shutdownMeetingRoom,

};