/* ==========================================================
   CONNECTX MEETING MODERATION

   Responsibility:
   - Host moderation requests
   - Soft mute participant
   - Force mute participant
   - Disable participant camera
   - Restrict participant camera
   - Remove participant
   - Participant moderation menu
   - Moderation request lifecycle

   This module does NOT:
   - Manage WebRTC peer connections
   - Access media devices
   - Create meeting WebSocket
   - Create signaling WebSocket
========================================================== */


import {
    getMeetingContext,
} from "./meeting_context.js";


import {
    getCsrfToken,
    parseJsonResponse,
} from "./meeting_api.js";


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHtml(
    value
) {

    const element =
        document.createElement(
            "div"
        );

    element.textContent =
        String(
            value
            ?? ""
        );

    return element.innerHTML;

}



/* ==========================================================
   GET PARTICIPANT ELEMENT
========================================================== */

const joinRequestRuntime = {

    panel:
        null,

    list:
        null,

};

function initializeJoinRequestUI() {

    joinRequestRuntime.panel =
        document.querySelector(
            "[data-join-requests-panel]"
        );

    joinRequestRuntime.list =
        document.querySelector(
            "[data-join-request-list]"
        );


    if (!joinRequestRuntime.panel) {
        return;
    }

    if (!joinRequestRuntime.list) {
        return;
    }


    console.log(
        "ConnectX join request UI initialized."
    );

}


function showJoinRequest(
    requestData
) {

    const context =
        getMeetingContext();


    if (!context.isHost) {
        return;
    }


    if (!joinRequestRuntime.panel) {
        return;
    }


    if (!joinRequestRuntime.list) {
        return;
    }


    const requestId =
        Number(
            requestData.request_id
        );


    if (
        !Number.isInteger(
            requestId
        )
    ) {
        return;
    }


    const username =
        String(
            requestData.username
            ||
            "Participant"
        );


    const existingRequest =
        joinRequestRuntime.list.querySelector(
            `[data-join-request-id="${requestId}"]`
        );


    if (existingRequest) {
        return;
    }


    const requestElement =
        document.createElement(
            "article"
        );


    requestElement.className =
        "cx-meeting-join-request";


    requestElement.dataset.joinRequestId =
        String(
            requestId
        );


    requestElement.innerHTML = `

        <div
            class="cx-meeting-join-request-info">

            <strong>
                ${escapeHtml(username)}
            </strong>

            <small>
                Wants to join this meeting
            </small>

        </div>


        <div
            class="cx-meeting-join-request-actions">

            <button
                type="button"
                data-join-request-action="reject"
                data-request-id="${requestId}">

                Reject

            </button>


            <button
                type="button"
                data-join-request-action="approve"
                data-request-id="${requestId}">

                Accept

            </button>

        </div>

    `;


    joinRequestRuntime.list.appendChild(
        requestElement
    );


    joinRequestRuntime.panel.hidden =
        false;

}


async function handleJoinRequestAction(
    requestId,
    action
) {

    const context =
        getMeetingContext();


    if (!context.isHost) {

        return;

    }


    const meetingCode =
        context.meetingCode;


    if (!meetingCode) {

        throw new Error(
            "Meeting code is unavailable."
        );

    }


    const endpoint =
        action === "approve"
            ? "approve"
            : "reject";


    const url =
        `/meetings/${meetingCode}/join-requests/${requestId}/${endpoint}/`;


    const response =
        await fetch(
            url,
            {
                method:
                    "POST",

                headers: {
                    "X-CSRFToken":
                        getCsrfToken(),

                    "Content-Type":
                        "application/json",
                },

                credentials:
                    "same-origin",
            }
        );


    const data =
        await parseJsonResponse(
            response
        )
        ||
        {};


    if (!response.ok) {

        throw new Error(
            data.error
            ||
            "Unable to process join request."
        );

    }


    removeJoinRequest(
        requestId
    );

}


function removeJoinRequest(
    requestId
) {

    const element =
        joinRequestRuntime.list
            ?.querySelector(
                `[data-join-request-id="${requestId}"]`
            );


    if (element) {

        element.remove();

    }


    if (
        joinRequestRuntime.list
        &&
        joinRequestRuntime.list
            .children
            .length === 0
    ) {

        joinRequestRuntime.panel.hidden =
            true;

    }

}


function bindJoinRequestEvents() {

    if (
        !joinRequestRuntime.list
    ) {
        return;
    }


    joinRequestRuntime.list.addEventListener(
        "click",
        async (
            event
        ) => {

            const button =
                event.target.closest(
                    "[data-join-request-action]"
                );


            if (!button) {
                return;
            }


            const requestId =
                Number(
                    button.dataset.requestId
                );


            const action =
                button.dataset.joinRequestAction;


            if (
                !Number.isInteger(
                    requestId
                )
            ) {
                return;
            }


            button.disabled =
                true;


            try {

                await handleJoinRequestAction(
                    requestId,
                    action
                );


            } catch (
                error
            ) {

                console.error(
                    "ConnectX join request error:",
                    error
                );


                button.disabled =
                    false;

            }

        }
    );

}





function getParticipantElement(
    participantId
) {

    const context = getMeetingContext();


    const normalizedParticipantId = Number(
        participantId
    );


    return (

        context
            .elements
            .participantList
            ?.querySelector(

                `[data-participant-id="${normalizedParticipantId}"]`

            )

        ||

        null

    );

}


/* ==========================================================
   GET PARTICIPANT USER ID
========================================================== */


function getParticipantUserId(
    participantElement
) {

    if (!participantElement) {

        return null;

    }


    const userId = Number(

        participantElement
            .dataset
            .userId

    );


    if (

        !Number.isInteger(
            userId
        )

        ||

        userId <= 0

    ) {

        return null;

    }


    return userId;

}


/* ==========================================================
   GET MODERATION URL
========================================================== */


function getModerationUrl(
    participantElement
) {

    if (!participantElement) {

        return null;

    }


    return (

        participantElement
            .dataset
            .moderationUrl

        ||

        null

    );

}


/* ==========================================================
   SEND MODERATION REQUEST
========================================================== */


async function sendModerationRequest(
    participantId,
    action
) {

    const participantElement = (

        getParticipantElement(
            participantId
        )

    );


    if (!participantElement) {

        throw new Error(
            "ConnectX participant was not found."
        );

    }


    const moderationUrl = (

        getModerationUrl(
            participantElement
        )

    );


    if (!moderationUrl) {

        throw new Error(
            "ConnectX moderation URL is unavailable."
        );

    }


    const response = await fetch(

        moderationUrl,

        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "X-CSRFToken":
                    getCsrfToken(),

            },

            credentials: "same-origin",

            body: JSON.stringify(
                {
                    action: action,
                }
            ),

        }

    );


        const data = (

            await parseJsonResponse(
                response
            )

            ||

            {}

        );


    if (!response.ok) {

        throw new Error(

            data.error

            ||

            "Unable to moderate participant."

        );

    }


    console.log(

        "ConnectX moderation request completed:",

        {

            participantId: Number(
                participantId
            ),

            action: action,

        }

    );


    return data;

}


/* ==========================================================
   MODERATE PARTICIPANT
========================================================== */


async function moderateParticipant(
    participantId,
    action
) {

    const context = getMeetingContext();


    if (!context.isHost) {

        throw new Error(
            "Only the meeting host can moderate participants."
        );

    }


    const normalizedParticipantId = Number(
        participantId
    );


    if (

        !Number.isInteger(
            normalizedParticipantId
        )

        ||

        normalizedParticipantId <= 0

    ) {

        throw new Error(
            "Invalid meeting participant ID."
        );

    }


    const participantElement = (

        getParticipantElement(
            normalizedParticipantId
        )

    );


    if (!participantElement) {

        throw new Error(
            "ConnectX participant was not found."
        );

    }


    const participantUserId = (

        getParticipantUserId(
            participantElement
        )

    );


    if (!participantUserId) {

        throw new Error(
            "ConnectX participant user identity is unavailable."
        );

    }


    if (
        participantUserId
        ===
        context.currentUserId
    ) {

        throw new Error(
            "The host cannot moderate themselves."
        );

    }


    const allowedActions = new Set(
        [
            "soft_mute",
            "force_mute",
            "disable_camera",
            "restrict_camera",
            "remove",
        ]
    );


    if (
        !allowedActions.has(
            action
        )
    ) {

        throw new Error(
            "Unsupported moderation action."
        );

    }


    return sendModerationRequest(

        normalizedParticipantId,

        action

    );

}


/* ==========================================================
   CLOSE PARTICIPANT MENUS
========================================================== */


function closeParticipantMenus(
    exceptMenu = null
) {

    const context = getMeetingContext();


    const menus = (

        context
            .elements
            .participantList
            ?.querySelectorAll(
                "[data-participant-menu]"
            )

        ||

        []

    );


    menus.forEach(
        (menu) => {

            if (
                menu === exceptMenu
            ) {

                return;

            }


            menu.hidden = true;

        }
    );

}


/* ==========================================================
   TOGGLE PARTICIPANT MENU
========================================================== */


function toggleParticipantMenu(
    button
) {

    const participantElement = (

        button.closest(
            "[data-participant-id]"
        )

    );


    if (!participantElement) {

        return;

    }


    const menu = (

        participantElement.querySelector(
            "[data-participant-menu]"
        )

    );


    if (!menu) {

        return;

    }


    const shouldOpen = (
        menu.hidden
    );


    closeParticipantMenus(
        menu
    );


    menu.hidden = (
        !shouldOpen
    );

}


/* ==========================================================
   HANDLE MODERATION ACTION
========================================================== */


async function handleModerationAction(
    button
) {

    const participantElement = (

        button.closest(
            "[data-participant-id]"
        )

    );


    if (!participantElement) {

        return;

    }


    const participantId = Number(

        participantElement
            .dataset
            .participantId

    );


    const action = (

        button
            .dataset
            .moderationAction

    );


    if (
        !participantId
        ||
        !action
    ) {

        return;

    }


    button.disabled = true;


    try {

        await moderateParticipant(

            participantId,

            action

        );


        closeParticipantMenus();

    } catch (error) {

        console.error(

            "ConnectX moderation action error:",

            error

        );

    } finally {

        button.disabled = false;

    }

}


/* ==========================================================
   HANDLE PARTICIPANT LIST CLICK
========================================================== */


function handleParticipantListClick(
    event
) {

    const context = getMeetingContext();


    if (!context.isHost) {

        return;

    }


    const menuButton = (

        event.target.closest(
            "[data-participant-menu-button]"
        )

    );


    if (menuButton) {

        event.preventDefault();


        toggleParticipantMenu(
            menuButton
        );


        return;

    }


    const moderationButton = (

        event.target.closest(
            "[data-moderation-action]"
        )

    );


    if (moderationButton) {

        event.preventDefault();


        handleModerationAction(
            moderationButton
        );


        return;

    }

}


/* ==========================================================
   HANDLE DOCUMENT CLICK
========================================================== */


function handleDocumentClick(
    event
) {

    const target = event.target;


    if (
        target.closest(
            "[data-participant-menu]"
        )
        ||
        target.closest(
            "[data-participant-menu-button]"
        )
    ) {

        return;

    }


    closeParticipantMenus();

}


/* ==========================================================
   INITIALIZE MODERATION
========================================================== */


function initializeModeration() {

    const context = getMeetingContext();


    if (!context.isHost) {

        console.log(
            "ConnectX moderation skipped for non-host."
        );


        return;

    }


    if (
        !context
            .elements
            .participantList
    ) {

        console.warn(
            "ConnectX participant list is unavailable for moderation."
        );


        return;

    }


    context
        .elements
        .participantList
        .addEventListener(

            "click",

            handleParticipantListClick

        );


    document.addEventListener(

        "click",

        handleDocumentClick

    );


    console.log(
        "ConnectX moderation initialized."
    );

    initializeJoinRequestUI();

    bindJoinRequestEvents();

}


/* ==========================================================
   EXPORTS
========================================================== */


export {
    initializeModeration,
    
    showJoinRequest,

    moderateParticipant,

    closeParticipantMenus,

};