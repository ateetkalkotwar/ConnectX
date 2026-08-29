/* ==========================================================
   CONNECTX MEETING SHELL

   Responsibility:

   - Hide application navigation while in a meeting
   - Hide the normal application header/search
   - Open application navigation from the meeting
   - Close application navigation
   - Keep meeting navigation state isolated

   This module does NOT:

   - Manage WebRTC
   - Manage participants
   - Manage chat
   - Manage meeting WebSockets
========================================================== */


const meetingShellRuntime = {

    initialized:
        false,

    shell:
        null,

    meetingRoom:
        null,

    menuToggle:
        null,

    sidebar:
        null,

    sidebarOverlay:
        null,

    sidebarClose:
        null,

    originalBodyOverflow:
        null,

};


/* ==========================================================
   INITIALIZE
========================================================== */

function initializeMeetingShell() {

    if (
        meetingShellRuntime.initialized
    ) {

        return;

    }


    meetingShellRuntime.shell =
        document.querySelector(
            "#cx-app-shell"
        );


    meetingShellRuntime.meetingRoom =
        document.querySelector(
            ".cx-meeting-room"
        );


    meetingShellRuntime.menuToggle =
        document.querySelector(
            "[data-meeting-shell-toggle]"
        );


    meetingShellRuntime.sidebar =
        document.querySelector(
            "#cx-sidebar"
        );


    meetingShellRuntime.sidebarOverlay =
        document.querySelector(
            "#cx-sidebar-overlay"
        );


    meetingShellRuntime.sidebarClose =
        document.querySelector(
            "#cx-sidebar-close"
        );


    if (
        !meetingShellRuntime.shell
        ||
        !meetingShellRuntime.meetingRoom
    ) {

        console.warn(
            "ConnectX meeting shell could not initialize: application shell or meeting room is missing."
        );

        return;

    }


    bindMeetingShellEvents();


    enterMeetingShellMode();


    meetingShellRuntime.initialized =
        true;


    console.log(
        "ConnectX meeting shell initialized."
    );

}


/* ==========================================================
   ENTER MEETING SHELL MODE
========================================================== */

function enterMeetingShellMode() {

    meetingShellRuntime.shell.classList.add(
        "cx-meeting-room-active",
        "cx-meeting-shell-closed"
    );


    meetingShellRuntime.shell.classList.remove(
        "cx-meeting-shell-open"
    );


    if (
        meetingShellRuntime.menuToggle
    ) {

        meetingShellRuntime.menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    document.body.classList.add(
        "cx-meeting-mode"
    );


    meetingShellRuntime.originalBodyOverflow =
        document.body.style.overflow;


    document.body.style.overflow =
        "hidden";

}


/* ==========================================================
   OPEN APPLICATION NAVIGATION
========================================================== */

function openMeetingNavigation() {

    if (
        !meetingShellRuntime.shell
    ) {

        return;

    }


    meetingShellRuntime.shell.classList.remove(
        "cx-meeting-shell-closed"
    );


    meetingShellRuntime.shell.classList.add(
        "cx-meeting-shell-open"
    );


    if (
        meetingShellRuntime.menuToggle
    ) {

        meetingShellRuntime.menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );

        meetingShellRuntime.menuToggle.setAttribute(
            "aria-label",
            "Close application navigation"
        );

    }


    console.log(
        "ConnectX meeting navigation opened."
    );

}


/* ==========================================================
   CLOSE APPLICATION NAVIGATION
========================================================== */

function closeMeetingNavigation() {

    if (
        !meetingShellRuntime.shell
    ) {

        return;

    }


    meetingShellRuntime.shell.classList.remove(
        "cx-meeting-shell-open"
    );


    meetingShellRuntime.shell.classList.add(
        "cx-meeting-shell-closed"
    );


    if (
        meetingShellRuntime.menuToggle
    ) {

        meetingShellRuntime.menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        meetingShellRuntime.menuToggle.setAttribute(
            "aria-label",
            "Open application navigation"
        );

    }


    console.log(
        "ConnectX meeting navigation closed."
    );

}


/* ==========================================================
   TOGGLE
========================================================== */

function toggleMeetingNavigation() {

    if (
        !meetingShellRuntime.shell
    ) {

        return;

    }


    const isOpen =
        meetingShellRuntime.shell.classList.contains(
            "cx-meeting-shell-open"
        );


    if (
        isOpen
    ) {

        closeMeetingNavigation();

        return;

    }


    openMeetingNavigation();

}


/* ==========================================================
   EVENT BINDING
========================================================== */

function bindMeetingShellEvents() {

    if (
        meetingShellRuntime.menuToggle
    ) {

        meetingShellRuntime.menuToggle.addEventListener(
            "click",
            toggleMeetingNavigation
        );

    }


    if (
        meetingShellRuntime.sidebarClose
    ) {

        meetingShellRuntime.sidebarClose.addEventListener(
            "click",
            closeMeetingNavigation
        );

    }


    if (
        meetingShellRuntime.sidebarOverlay
    ) {

        meetingShellRuntime.sidebarOverlay.addEventListener(
            "click",
            closeMeetingNavigation
        );

    }


    document.addEventListener(
        "keydown",
        handleMeetingShellKeydown
    );

}


/* ==========================================================
   KEYBOARD
========================================================== */

function handleMeetingShellKeydown(
    event
) {

    if (
        event.key !==
        "Escape"
    ) {

        return;

    }


    if (
        !meetingShellRuntime.shell
    ) {

        return;

    }


    if (
        meetingShellRuntime.shell.classList.contains(
            "cx-meeting-shell-open"
        )
    ) {

        closeMeetingNavigation();

    }

}


/* ==========================================================
   SHUTDOWN
========================================================== */

function shutdownMeetingShell() {

    if (
        meetingShellRuntime.originalBodyOverflow !==
        null
    ) {

        document.body.style.overflow =
            meetingShellRuntime.originalBodyOverflow;

    }


    document.body.classList.remove(
        "cx-meeting-mode"
    );


    meetingShellRuntime.initialized =
        false;

}


/* ==========================================================
   EXPORTS
========================================================== */

export {

    initializeMeetingShell,

    openMeetingNavigation,

    closeMeetingNavigation,

    toggleMeetingNavigation,

    shutdownMeetingShell,

};