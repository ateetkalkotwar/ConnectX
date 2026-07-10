/* ==========================================================
   CONNECTX MEETING API

   Responsibility:
   - CSRF token access
   - Participant state API requests
   - Shared meeting HTTP request helpers

   This module does NOT:
   - Manage UI
   - Access media devices
   - Manage WebSockets
   - Manage WebRTC peers
========================================================== */


/* ==========================================================
   GET CSRF TOKEN
========================================================== */


function getCsrfToken() {

    const cookie = (

        document.cookie
            .split(";")
            .map(
                (item) => {

                    return item.trim();

                }
            )
            .find(
                (item) => {

                    return item.startsWith(
                        "csrftoken="
                    );

                }
            )

    );


    if (!cookie) {

        return null;

    }


    return decodeURIComponent(

        cookie.substring(
            "csrftoken=".length
        )

    );

}


/* ==========================================================
   PARSE JSON RESPONSE
========================================================== */


async function parseJsonResponse(
    response
) {

    try {

        return await response.json();

    } catch (error) {

        console.error(

            "ConnectX invalid JSON API response:",

            error

        );


        return null;

    }

}


/* ==========================================================
   UPDATE PARTICIPANT STATE
========================================================== */


async function updateParticipantState(
    stateUrl,
    state,
    value
) {

    if (!stateUrl) {

        throw new Error(
            "ConnectX participant state URL is unavailable."
        );

    }


    const csrfToken = getCsrfToken();


    if (!csrfToken) {

        throw new Error(
            "ConnectX CSRF token is unavailable."
        );

    }


    const response = await fetch(

        stateUrl,

        {

            method: "POST",

            headers: {

                "Content-Type": (
                    "application/json"
                ),

                "X-CSRFToken": (
                    csrfToken
                ),

            },

            credentials: "same-origin",

            body: JSON.stringify({

                state: state,

                value: Boolean(
                    value
                ),

            }),

        }

    );


    const data = await parseJsonResponse(
        response
    );


    if (!data) {

        throw new Error(
            "ConnectX received an invalid participant state response."
        );

    }


    if (
        !response.ok
        ||
        !data.success
    ) {

        throw new Error(

            data.error

            ||

            "Unable to update participant state."

        );

    }


    return data.participant;

}


/* ==========================================================
   EXPORTS
========================================================== */


export {

    getCsrfToken,

    parseJsonResponse,

    updateParticipantState,

};