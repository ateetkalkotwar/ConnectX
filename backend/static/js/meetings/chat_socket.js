/* ==========================================================
   CONNECTX CHAT SOCKET

   Responsibility:

   - Chat message transport
   - Chat message sending
   - Chat message event listeners

   This module does NOT:

   - Create a new WebSocket
   - Manage WebSocket connection lifecycle
   - Manage heartbeat
   - Render chat UI
========================================================== */

import {
    getMeetingContext,
} from "./meeting_context.js";




/* ==========================================================
   CHAT SOCKET RUNTIME
========================================================== */

const chatSocketRuntime = {

    initialized: false,

    messageListeners: new Set(),

};


/* ==========================================================
   INITIALIZE CHAT SOCKET
========================================================== */

function initializeChatSocket() {

    if (
        chatSocketRuntime.initialized
    ) {

        return;

    }

    chatSocketRuntime.initialized = true;

    console.log(
        "ConnectX Chat Socket initialized."
    );

}


/* ==========================================================
   SEND CHAT MESSAGE
========================================================== */

function sendChatMessage(
    message
) {

    const context =
        getMeetingContext();

    const socket =
        context.meetingSocket;


    if (
        !socket
        ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        console.warn(
            "ConnectX chat message could not be sent: meeting socket is not connected."
        );

        return false;

    }


    const normalizedMessage =
        String(
            message ?? ""
        ).trim();


    if (!normalizedMessage) {

        return false;

    }


    socket.send(
        JSON.stringify(
            {
                type:
                    "chat_message",

                message:
                    normalizedMessage,
            }
        )
    );


    return true;

}


/* ==========================================================
   HANDLE CHAT MESSAGE
========================================================== */

function handleChatMessage(
    data
) {

    if (
        !data
        ||
        typeof data !==
            "object"
    ) {

        return;

    }


    if (
        data.type !==
        "chat_message"
    ) {

        return;

    }


    chatSocketRuntime
        .messageListeners
        .forEach(
            (
                listener
            ) => {

                try {

                    listener(
                        data
                    );

                }
                catch (
                    error
                ) {

                    console.error(
                        "ConnectX chat message listener error:",
                        error
                    );

                }

            }
        );


}


/* ==========================================================
   ADD CHAT MESSAGE LISTENER
========================================================== */

function addChatMessageListener(
    listener
) {

    if (
        typeof listener !==
        "function"
    ) {

        throw new TypeError(
            "ConnectX chat message listener must be a function."
        );

    }


    chatSocketRuntime
        .messageListeners
        .add(
            listener
        );


    return () => {

        chatSocketRuntime
            .messageListeners
            .delete(
                listener
            );

    };

}


/* ==========================================================
   CLEAR CHAT MESSAGE LISTENERS
========================================================== */

function clearChatMessageListeners() {

    chatSocketRuntime
        .messageListeners
        .clear();

}


/* ==========================================================
   CLEANUP CHAT SOCKET
========================================================== */

function cleanupChatSocket() {

    chatSocketRuntime
        .messageListeners
        .clear();

    chatSocketRuntime.initialized =
        false;


    console.log(
        "ConnectX Chat Socket cleaned."
    );

}


/* ==========================================================
   EXPORTS
========================================================== */

export {

    initializeChatSocket,

    sendChatMessage,

    handleChatMessage,

    addChatMessageListener,

    clearChatMessageListeners,

    cleanupChatSocket,

};