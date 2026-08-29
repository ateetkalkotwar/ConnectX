/* ==========================================================
   CONNECTX SIDE PANEL

   Responsibility:

   - Participants panel visibility
   - Chat panel visibility
   - People button state
   - Chat button state
   - Only one side panel open at a time

   This module does NOT:

   - Manage participant data
   - Manage chat messages
   - Create WebSockets
   - Manage WebRTC
========================================================== */


import {
    openChat,
    closeChat,
} from "./chat.js?v=20260827_1";





const sidePanelRuntime = {

    initialized:
        false,

    activePanel:
        null,

    peopleButton:
        null,

    chatButton:
        null,

    participantsPanel:
        null,

    chatPanel:
        null,

    participantCloseButton:
        null,

    chatCloseButton:
        null,

};


/* ==========================================================
   INITIALIZE SIDE PANEL
========================================================== */

function initializeSidePanel() {

    if (
        sidePanelRuntime.initialized
    ) {

        return;

    }


    sidePanelRuntime.peopleButton =
        document.querySelector(
            '[data-meeting-control="people"]'
        );


    sidePanelRuntime.chatButton =
        document.querySelector(
            '[data-meeting-control="chat"]'
        );


    sidePanelRuntime.participantsPanel =
        document.querySelector(
            "[data-participants-panel]"
        )
        ||
        document.querySelector(
            ".cx-meeting-room-panel"
        );


    sidePanelRuntime.chatPanel =
        document.querySelector(
            "[data-chat-panel]"
        );


    sidePanelRuntime.participantCloseButton =
        document.querySelector(
            "[data-participant-close]"
        );


    sidePanelRuntime.chatCloseButton =
        document.querySelector(
            "[data-chat-close]"
        );


    if (
        !sidePanelRuntime.peopleButton
    ) {

        console.warn(
            "ConnectX People button was not found."
        );

    }


    if (
        !sidePanelRuntime.chatButton
    ) {

        console.warn(
            "ConnectX Chat button was not found."
        );

    }


    if (
        !sidePanelRuntime.participantsPanel
    ) {

        console.warn(
            "ConnectX participants panel was not found."
        );

    }


    bindSidePanelEvents();


    closeAllSidePanels();


    /*
    * The initial close is only a state reset.
    * Do not leave the Chat button visually focused
    * when the meeting first loads.
    */

    if (
        document.activeElement ===
        sidePanelRuntime.chatButton
    ) {

        sidePanelRuntime.chatButton.blur();

    }


    if (
        document.activeElement ===
        sidePanelRuntime.peopleButton
    ) {

        sidePanelRuntime.peopleButton.blur();

    }


    sidePanelRuntime.initialized =
        true;


    console.log(
        "ConnectX side panel initialized."
    );

}


/* ==========================================================
   BIND EVENTS
========================================================== */

function bindSidePanelEvents() {

    if (
        sidePanelRuntime.peopleButton
    ) {

        sidePanelRuntime.peopleButton.addEventListener(
            "click",
            handlePeopleButtonClick
        );

    }


    if (
        sidePanelRuntime.chatButton
    ) {

        sidePanelRuntime.chatButton.addEventListener(
            "click",
            handleChatButtonClick
        );

    }


    if (
        sidePanelRuntime.participantCloseButton
    ) {

        sidePanelRuntime.participantCloseButton.addEventListener(
            "click",
            handleParticipantCloseClick
        );

    }


    if (
        sidePanelRuntime.chatCloseButton
    ) {

        sidePanelRuntime.chatCloseButton.addEventListener(
            "click",
            handleChatCloseClick
        );

    }


    document.addEventListener(
        "click",
        handleOutsidePanelClick
    );


    document.addEventListener(
        "keydown",
        handleSidePanelKeydown
    );

}


/* ==========================================================
   PEOPLE BUTTON
========================================================== */

function handlePeopleButtonClick() {

    if (
        sidePanelRuntime.activePanel ===
        "participants"
    ) {

        closeAllSidePanels();

        return;

    }


    openParticipantsPanel();

}


/* ==========================================================
   CHAT CLOSE BUTTON
========================================================== */

function handleChatCloseClick() {

    closeAllSidePanels();

}


/* ==========================================================
   OUTSIDE PANEL CLICK
========================================================== */

function handleOutsidePanelClick(
    event
) {

    if (
        !sidePanelRuntime.activePanel
    ) {

        return;

    }


    const target =
        event.target;


    if (
        sidePanelRuntime.participantsPanel
        &&
        sidePanelRuntime.participantsPanel.contains(
            target
        )
    ) {

        return;

    }


    if (
        sidePanelRuntime.chatPanel
        &&
        sidePanelRuntime.chatPanel.contains(
            target
        )
    ) {

        return;

    }


    if (
        sidePanelRuntime.peopleButton
        &&
        sidePanelRuntime.peopleButton.contains(
            target
        )
    ) {

        return;

    }


    if (
        sidePanelRuntime.chatButton
        &&
        sidePanelRuntime.chatButton.contains(
            target
        )
    ) {

        return;

    }


    closeAllSidePanels();

}



/* ==========================================================
   ESCAPE TO CLOSE
========================================================== */

function handleSidePanelKeydown(
    event
) {

    if (
        event.key !==
        "Escape"
    ) {

        return;

    }


    if (
        !sidePanelRuntime.activePanel
    ) {

        return;

    }


    closeAllSidePanels();

}



/* ==========================================================
   PARTICIPANTS CLOSE BUTTON
========================================================== */

function handleParticipantCloseClick() {

    closeAllSidePanels();

}



/* ==========================================================
   CHAT BUTTON
========================================================== */

function handleChatButtonClick() {

    if (
        sidePanelRuntime.activePanel ===
        "chat"
    ) {

        closeAllSidePanels();

        return;

    }


    openChatPanel();

}


/* ==========================================================
   OPEN PARTICIPANTS PANEL
========================================================== */

function openParticipantsPanel() {

    closeChatPanel();


    if (
        sidePanelRuntime.participantsPanel
    ) {

        sidePanelRuntime.participantsPanel.hidden =
            false;

        sidePanelRuntime.participantsPanel.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    sidePanelRuntime.activePanel =
        "participants";


    updateButtonState(
        sidePanelRuntime.peopleButton,
        true
    );


    updateButtonState(
        sidePanelRuntime.chatButton,
        false
    );

}


/* ==========================================================
   OPEN CHAT PANEL
========================================================== */

function openChatPanel() {

    closeParticipantsPanel();


    openChat();


    sidePanelRuntime.activePanel =
        "chat";


    updateButtonState(
        sidePanelRuntime.peopleButton,
        false
    );


    updateButtonState(
        sidePanelRuntime.chatButton,
        true
    );

}


/* ==========================================================
   CLOSE PARTICIPANTS PANEL
========================================================== */

function closeParticipantsPanel() {

    if (
        sidePanelRuntime.participantsPanel
    ) {

        sidePanelRuntime.participantsPanel.hidden =
            true;

        sidePanelRuntime.participantsPanel.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    updateButtonState(
        sidePanelRuntime.peopleButton,
        false
    );

}


/* ==========================================================
   CLOSE CHAT PANEL
========================================================== */

function closeChatPanel() {

    closeChat();


    updateButtonState(
        sidePanelRuntime.chatButton,
        false
    );

}


/* ==========================================================
   CLOSE ALL SIDE PANELS
========================================================== */

function closeAllSidePanels() {

    closeParticipantsPanel();

    closeChatPanel();


    sidePanelRuntime.activePanel =
        null;

}


/* ==========================================================
   UPDATE BUTTON STATE
========================================================== */

function updateButtonState(
    button,
    active
) {

    if (
        !button
    ) {

        return;

    }


    button.classList.toggle(
        "cx-meeting-control--active",
        Boolean(
            active
        )
    );


    button.setAttribute(
        "aria-expanded",
        String(
            Boolean(
                active
            )
        )
    );

}


/* ==========================================================
   EXPORTS
========================================================== */

export {

    initializeSidePanel,

    openParticipantsPanel,

    openChatPanel,

    closeParticipantsPanel,

    closeChatPanel,

    closeAllSidePanels,

};