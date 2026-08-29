/* ==========================================================
   CONNECTX MEETING UI VISIBILITY

   Responsibility:

   - Show temporary meeting UI
   - Hide temporary meeting UI after inactivity
   - Keep video permanently visible
   - Keep menu button permanently visible
   - Keep open side panels visible

   This module does NOT:

   - Hide the meeting room
   - Hide the video stage
   - Manage WebRTC
   - Manage participants
   - Manage chat transport
   - Manage meeting WebSockets
========================================================== */


const meetingUIVisibilityRuntime = {

    initialized:
        false,

    meetingRoom:
        null,

    header:
        null,

    meetingInfo:
        null,

    role:
        null,

    leaveButton:
        null,

    thumbnailStrip:
        null,

    controls:
        null,

    menuButton:
        null,

    hideTimer:
        null,

    inactivityDelay:
        3000,

    hidden:
        false,

};


/* ==========================================================
   INITIALIZE
========================================================== */

function initializeMeetingUIVisibility() {

    if (
        meetingUIVisibilityRuntime.initialized
    ) {

        return;

    }


    meetingUIVisibilityRuntime.meetingRoom =
        document.querySelector(
            ".cx-meeting-room"
        );


    meetingUIVisibilityRuntime.header =
        document.querySelector(
            ".cx-meeting-room-header"
        );


    meetingUIVisibilityRuntime.meetingInfo =
        document.querySelector(
            ".cx-meeting-room-info"
        );


    meetingUIVisibilityRuntime.role =
        document.querySelector(
            ".cx-meeting-room-role"
        );


    meetingUIVisibilityRuntime.leaveButton =
        document.querySelector(
            ".cx-meeting-room-leave"
        );


    meetingUIVisibilityRuntime.thumbnailStrip =
        document.querySelector(
            ".cx-meeting-thumbnail-strip"
        );


    meetingUIVisibilityRuntime.controls =
        document.querySelector(
            ".cx-meeting-room-controls"
        );


    meetingUIVisibilityRuntime.menuButton =
        document.querySelector(
            "[data-meeting-shell-toggle]"
        );


    if (
        !meetingUIVisibilityRuntime.meetingRoom
    ) {

        console.warn(
            "ConnectX meeting UI visibility could not initialize: meeting room not found."
        );

        return;

    }


    bindMeetingUIActivity();


    showMeetingUI();


    startHideTimer();


    meetingUIVisibilityRuntime.initialized =
        true;


    console.log(
        "ConnectX meeting UI visibility initialized."
    );

}


/* ==========================================================
   SIDE PANEL STATE
========================================================== */

function isSidePanelOpen() {

    const participantsPanel =
        document.querySelector(
            ".cx-meeting-room-panel:not([hidden])"
        );


    const chatPanel =
        document.querySelector(
            ".cx-meeting-room-chat-panel:not([hidden])"
        );


    return Boolean(
        participantsPanel
        ||
        chatPanel
    );

}


/* ==========================================================
   APPLICATION SIDEBAR STATE
========================================================== */

function isApplicationSidebarOpen() {

    const shell =
        document.querySelector(
            "#cx-app-shell"
        );


    if (
        !shell
    ) {

        return false;

    }


    return shell.classList.contains(
        "cx-meeting-shell-open"
    );

}


/* ==========================================================
   SHOW MEETING UI
========================================================== */

function showMeetingUI() {

    const elements = [

        meetingUIVisibilityRuntime.header,

        meetingUIVisibilityRuntime.meetingInfo,

        meetingUIVisibilityRuntime.role,

        meetingUIVisibilityRuntime.leaveButton,

        meetingUIVisibilityRuntime.thumbnailStrip,

        meetingUIVisibilityRuntime.controls,

    ];


    elements.forEach(
        (
            element
        ) => {

            if (
                element
            ) {

                element.classList.remove(
                    "cx-meeting-ui-hidden"
                );

            }

        }
    );


    /*
     * The menu button is never hidden.
     */

    if (
        meetingUIVisibilityRuntime.menuButton
    ) {

        meetingUIVisibilityRuntime.menuButton.classList.remove(
            "cx-meeting-ui-hidden"
        );

    }


    meetingUIVisibilityRuntime.hidden =
        false;

}


/* ==========================================================
   HIDE MEETING UI
========================================================== */

function hideMeetingUI() {

    /*
     * Never hide temporary UI while a side
     * panel is being used.
     */

    if (
        isSidePanelOpen()
    ) {

        showMeetingUI();

        return;

    }


    /*
     * Never hide temporary UI while the
     * application navigation is open.
     */

    if (
        isApplicationSidebarOpen()
    ) {

        showMeetingUI();

        return;

    }


    const elements = [

        meetingUIVisibilityRuntime.header,

        meetingUIVisibilityRuntime.meetingInfo,

        meetingUIVisibilityRuntime.role,

        meetingUIVisibilityRuntime.leaveButton,

        meetingUIVisibilityRuntime.thumbnailStrip,

        meetingUIVisibilityRuntime.controls,

    ];


    elements.forEach(
        (
            element
        ) => {

            if (
                element
            ) {

                element.classList.add(
                    "cx-meeting-ui-hidden"
                );

            }

        }
    );


    /*
     * Explicitly keep the menu button visible.
     */

    if (
        meetingUIVisibilityRuntime.menuButton
    ) {

        meetingUIVisibilityRuntime.menuButton.classList.remove(
            "cx-meeting-ui-hidden"
        );

    }


    meetingUIVisibilityRuntime.hidden =
        true;

}


/* ==========================================================
   TIMER
========================================================== */

function startHideTimer() {

    clearHideTimer();


    meetingUIVisibilityRuntime.hideTimer =
        window.setTimeout(
            () => {

                hideMeetingUI();

            },

            meetingUIVisibilityRuntime.inactivityDelay

        );

}


function clearHideTimer() {

    if (
        meetingUIVisibilityRuntime.hideTimer ===
        null
    ) {

        return;

    }


    window.clearTimeout(
        meetingUIVisibilityRuntime.hideTimer
    );


    meetingUIVisibilityRuntime.hideTimer =
        null;

}


/* ==========================================================
   USER ACTIVITY
========================================================== */

function handleMeetingActivity(
    event
) {

    if (
        event
        &&
        event.isTrusted === false
    ) {

        return;

    }


    showMeetingUI();


    startHideTimer();

}


/* ==========================================================
   EVENT BINDING
========================================================== */

function bindMeetingUIActivity() {

    const events = [

        "mousemove",

        "mousedown",

        "pointerdown",

        "touchstart",

        "keydown",

    ];


    events.forEach(
        (
            eventName
        ) => {

            document.addEventListener(
                eventName,
                handleMeetingActivity,
                {
                    passive:
                        eventName ===
                        "touchstart",
                }
            );

        }
    );

}


/* ==========================================================
   FORCE SHOW
========================================================== */

function forceShowMeetingUI() {

    showMeetingUI();

    startHideTimer();

}


/* ==========================================================
   SHUTDOWN
========================================================== */

function shutdownMeetingUIVisibility() {

    clearHideTimer();


    showMeetingUI();


    meetingUIVisibilityRuntime.initialized =
        false;


    meetingUIVisibilityRuntime.hidden =
        false;

}


/* ==========================================================
   EXPORTS
========================================================== */

export {

    initializeMeetingUIVisibility,

    forceShowMeetingUI,

    showMeetingUI,

    hideMeetingUI,

    shutdownMeetingUIVisibility,

};