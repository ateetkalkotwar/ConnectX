/* ==========================================================
   CONNECTX CHAT

   Responsibility:

   - Chat panel UI
   - Open / close chat
   - Message input
   - Send button
   - Enter-to-send
   - Render messages
   - Empty state
   - Unread message count

   This module does NOT:

   - Create WebSockets
   - Manage WebSocket lifecycle
   - Handle meeting presence
   - Handle WebRTC
========================================================== */

import {
    initializeChatSocket,
    sendChatMessage,
    addChatMessageListener,
} from "./chat_socket.js";

import {
    getMeetingContext,
} from "./meeting_context.js";


/* ==========================================================
   CHAT RUNTIME
========================================================== */

const chatRuntime = {

    initialized: false,

    panel: null,

    closeButton: null,

    messagesContainer: null,

    emptyState: null,

    form: null,

    input: null,

    sendButton: null,

    chatButton: null,

    unreadCount: 0,

    isOpen: false,

    removeMessageListener: null,

};


/* ==========================================================
   INITIALIZE CHAT
========================================================== */

function initializeChat() {

    if (
        chatRuntime.initialized
    ) {

        return chatRuntime;

    }


    const context =
        getMeetingContext();


    chatRuntime.panel =
        document.querySelector(
            "[data-chat-panel]"
        );

    chatRuntime.closeButton =
        document.querySelector(
            "[data-chat-close]"
        );

    chatRuntime.messagesContainer =
        document.querySelector(
            "[data-chat-messages]"
        );

    chatRuntime.emptyState =
        document.querySelector(
            "[data-chat-empty]"
        );

    chatRuntime.form =
        document.querySelector(
            "[data-chat-form]"
        );

    chatRuntime.input =
        document.querySelector(
            "[data-chat-input]"
        );

    chatRuntime.sendButton =
        document.querySelector(
            "[data-chat-send]"
        );

    chatRuntime.chatButton =
        context.elements.meetingRoom?.querySelector(
            '[data-meeting-control="chat"]'
        )
        ||
        document.querySelector(
            '[data-meeting-control="chat"]'
        );


    if (
        !chatRuntime.panel
    ) {

        console.warn(
            "ConnectX chat panel was not found."
        );

        return null;

    }


    if (
        !chatRuntime.messagesContainer
        ||
        !chatRuntime.form
        ||
        !chatRuntime.input
    ) {

        console.warn(
            "ConnectX chat elements are incomplete."
        );

        return null;

    }



    initializeChatSocket();


    bindChatEvents();


    chatRuntime.removeMessageListener =
        addChatMessageListener(
            handleIncomingChatMessage
        );


    chatRuntime.initialized = true;


    updateEmptyState();


    console.log(
        "ConnectX Chat initialized."
    );


    return chatRuntime;

}




/* ==========================================================
   BIND CHAT EVENTS
========================================================== */

function bindChatEvents() {


    chatRuntime.form.addEventListener(
        "submit",
        handleChatSubmit
    );


    if (
        chatRuntime.sendButton
    ) {

        chatRuntime.sendButton.addEventListener(
            "click",
            sendCurrentMessage
        );

    }


    chatRuntime.input.addEventListener(
        "keydown",
        handleChatInputKeydown
    );

}


/* ==========================================================
   TOGGLE CHAT
========================================================== */

function toggleChat() {

    if (
        chatRuntime.isOpen
    ) {

        closeChat();

    }
    else {

        openChat();

    }

}


/* ==========================================================
   OPEN CHAT
========================================================== */

function openChat() {

    if (
        !chatRuntime.panel
    ) {

        return;

    }


    chatRuntime.isOpen =
        true;

    chatRuntime.unreadCount =
        0;


    chatRuntime.panel.hidden =
        false;


    if (
        chatRuntime.chatButton
    ) {

        chatRuntime.chatButton.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    window.requestAnimationFrame(
        () => {

            chatRuntime.input?.focus();

            scrollMessagesToBottom();

        }
    );


    updateUnreadIndicator();

}


/* ==========================================================
   CLOSE CHAT
========================================================== */

function closeChat() {

    if (
        !chatRuntime.panel
    ) {

        return;

    }


    /*
     * Move focus outside the chat panel
     * before hiding it.
     */

    if (
        chatRuntime.chatButton
    ) {

        chatRuntime.chatButton.focus({
            preventScroll: true,
        });

    }


    chatRuntime.isOpen =
        false;


    chatRuntime.panel.hidden =
        true;


    if (
        chatRuntime.chatButton
    ) {

        chatRuntime.chatButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

}


/* ==========================================================
   HANDLE FORM SUBMIT
========================================================== */

function handleChatSubmit(
    event
) {

    event.preventDefault();


    sendCurrentMessage();

}


/* ==========================================================
   HANDLE INPUT KEYDOWN
========================================================== */

function handleChatInputKeydown(
    event
) {

    if (
        event.key !== "Enter"
    ) {

        return;

    }


    if (
        event.shiftKey
    ) {

        return;

    }


    event.preventDefault();


    sendCurrentMessage();

}


/* ==========================================================
   SEND CURRENT MESSAGE
========================================================== */

function sendCurrentMessage() {

    if (
        !chatRuntime.input
    ) {

        return;

    }


    const message =
        chatRuntime.input.value.trim();


    if (!message) {

        return;

    }


    const sent =
        sendChatMessage(
            message
        );


    if (!sent) {

        console.warn(
            "ConnectX chat message could not be sent."
        );

        return;

    }


    chatRuntime.input.value = "";

}


/* ==========================================================
   HANDLE INCOMING CHAT MESSAGE
========================================================== */

function handleIncomingChatMessage(
    data
) {

    if (
        !data
        ||
        data.type !==
            "chat_message"
    ) {

        return;

    }


    renderMessage(
        data
    );


    if (
        !chatRuntime.isOpen
    ) {

        chatRuntime.unreadCount += 1;

        updateUnreadIndicator();

    }

}


/* ==========================================================
   RENDER MESSAGE
========================================================== */

function renderMessage(
    data
) {

    if (
        !chatRuntime.messagesContainer
    ) {

        return;

    }


    const context =
        getMeetingContext();


    const userId =
        Number(
            data.user_id
        );


    const currentUserId =
        Number(
            context.currentUserId
        );


    const isOwnMessage =
        userId ===
        currentUserId;


    const username =
        String(
            data.username ||
            "Participant"
        );


    const message =
        String(
            data.message ||
            ""
        );


    if (!message) {

        return;

    }


    const messageElement =
        document.createElement(
            "article"
        );


    messageElement.className =
        "cx-meeting-chat-message";


    messageElement.classList.toggle(
        "cx-meeting-chat-message--own",
        isOwnMessage
    );


    const header =
        document.createElement(
            "div"
        );


    header.className =
        "cx-meeting-chat-message-header";


    const name =
        document.createElement(
            "strong"
        );


    name.className =
        "cx-meeting-chat-message-name";


    name.textContent =
        isOwnMessage
            ? "You"
            : username;


    const timestamp =
        document.createElement(
            "time"
        );


    timestamp.className =
        "cx-meeting-chat-message-time";


    timestamp.dateTime =
        new Date().toISOString();


    timestamp.textContent =
        formatMessageTime();


    header.appendChild(
        name
    );

    header.appendChild(
        timestamp
    );


    const body =
        document.createElement(
            "p"
        );


    body.className =
        "cx-meeting-chat-message-body";


    body.textContent =
        message;


    messageElement.appendChild(
        header
    );

    messageElement.appendChild(
        body
    );


    chatRuntime.messagesContainer.appendChild(
        messageElement
    );


    updateEmptyState();

    scrollMessagesToBottom();

}


/* ==========================================================
   FORMAT MESSAGE TIME
========================================================== */

function formatMessageTime() {

    return new Intl.DateTimeFormat(
        undefined,
        {
            hour: "numeric",
            minute: "2-digit",
        }
    ).format(
        new Date()
    );

}


/* ==========================================================
   UPDATE EMPTY STATE
========================================================== */

function updateEmptyState() {

    if (
        !chatRuntime.emptyState
        ||
        !chatRuntime.messagesContainer
    ) {

        return;

    }


    const hasMessages =
        chatRuntime.messagesContainer
            .children
            .length > 0;


    chatRuntime.emptyState.hidden =
        hasMessages;

}


/* ==========================================================
   SCROLL TO BOTTOM
========================================================== */

function scrollMessagesToBottom() {

    if (
        !chatRuntime.messagesContainer
    ) {

        return;

    }


    chatRuntime.messagesContainer.scrollTop =
        chatRuntime.messagesContainer.scrollHeight;

}


/* ==========================================================
   UNREAD INDICATOR
========================================================== */

function updateUnreadIndicator() {

    if (
        !chatRuntime.chatButton
    ) {

        return;

    }


    chatRuntime.chatButton.dataset.unread =
        String(
            chatRuntime.unreadCount
        );

}


/* ==========================================================
   CLEANUP CHAT
========================================================== */

function cleanupChat() {

    if (
        chatRuntime.removeMessageListener
    ) {

        chatRuntime.removeMessageListener();

        chatRuntime.removeMessageListener =
            null;

    }


    chatRuntime.initialized =
        false;

    chatRuntime.panel =
        null;

    chatRuntime.closeButton =
        null;

    chatRuntime.messagesContainer =
        null;

    chatRuntime.emptyState =
        null;

    chatRuntime.form =
        null;

    chatRuntime.input =
        null;

    chatRuntime.sendButton =
        null;

    chatRuntime.chatButton =
        null;

    chatRuntime.unreadCount =
        0;

    chatRuntime.isOpen =
        false;


    console.log(
        "ConnectX Chat cleaned."
    );

}


/* ==========================================================
   EXPORTS
========================================================== */

export {

    initializeChat,

    openChat,

    closeChat,

    toggleChat,

    cleanupChat,

};