"use strict";


const shareRuntime = {

    initialized:
        false,

    button:
        null,

    popover:
        null,

    closeButton:
        null,

    copyButton:
        null,

    urlInput:
        null,

    status:
        null,

};


function initializeMeetingShare() {

    if (
        shareRuntime.initialized
    ) {

        return;

    }


    shareRuntime.button =
        document.querySelector(
            '[data-meeting-control="share-meeting"]'
        );


    shareRuntime.popover =
        document.querySelector(
            "[data-meeting-share-popover]"
        );


    shareRuntime.closeButton =
        document.querySelector(
            "[data-meeting-share-close]"
        );


    shareRuntime.copyButton =
        document.querySelector(
            "[data-meeting-share-copy]"
        );


    shareRuntime.urlInput =
        document.querySelector(
            "[data-meeting-share-url]"
        );


    shareRuntime.status =
        document.querySelector(
            "[data-meeting-share-status]"
        );


    if (
        !shareRuntime.button
        ||
        !shareRuntime.popover
    ) {

        console.warn(
            "ConnectX meeting share UI was not found."
        );

        return;

    }


    shareRuntime.button.addEventListener(
        "click",
        toggleMeetingShare
    );


    if (
        shareRuntime.closeButton
    ) {

        shareRuntime.closeButton.addEventListener(
            "click",
            closeMeetingShare
        );

    }


    if (
        shareRuntime.copyButton
    ) {

        shareRuntime.copyButton.addEventListener(
            "click",
            copyMeetingShareLink
        );

    }


    document.addEventListener(
        "click",
        handleMeetingShareOutsideClick
    );


    shareRuntime.initialized =
        true;


    console.log(
        "ConnectX meeting share initialized."
    );

}


function toggleMeetingShare(
    event
) {

    event.stopPropagation();


    if (
        shareRuntime.popover.hidden
    ) {

        shareRuntime.popover.hidden =
            false;

        return;

    }


    closeMeetingShare();

}


function closeMeetingShare() {

    if (
        !shareRuntime.popover
    ) {

        return;

    }


    shareRuntime.popover.hidden =
        true;

}


async function copyMeetingShareLink(
    event
) {

    event.preventDefault();

    event.stopPropagation();


    if (
        !shareRuntime.urlInput
    ) {

        return;

    }


    const url =
        shareRuntime.urlInput.value.trim();


    if (!url) {

        console.warn(
            "ConnectX meeting share URL is empty."
        );

        return;

    }


    let copied =
        false;


    /*
     * Preferred clipboard API
     */

    if (
        navigator.clipboard
        &&
        window.isSecureContext
    ) {

        try {

            await navigator.clipboard.writeText(
                url
            );

            copied =
                true;

        } catch (
            error
        ) {

            console.warn(
                "ConnectX clipboard API failed:",
                error
            );

        }

    }


    /*
     * Fallback for browsers where
     * the Clipboard API is unavailable.
     */

    if (!copied) {

        try {

            const temporaryInput =
                document.createElement(
                    "textarea"
                );


            temporaryInput.value =
                url;


            temporaryInput.setAttribute(
                "readonly",
                ""
            );


            temporaryInput.style.position =
                "fixed";


            temporaryInput.style.left =
                "-9999px";


            temporaryInput.style.top =
                "0";


            document.body.appendChild(
                temporaryInput
            );


            temporaryInput.focus();

            temporaryInput.select();


            temporaryInput.setSelectionRange(
                0,
                temporaryInput.value.length
            );


            copied =
                document.execCommand(
                    "copy"
                );


            temporaryInput.remove();

        } catch (
            error
        ) {

            console.error(
                "ConnectX fallback copy failed:",
                error
            );

        }

    }


    /*
     * Update UI
     */

    if (copied) {

        if (
            shareRuntime.status
        ) {

            shareRuntime.status.textContent =
                "Link copied";

        }


        if (
            shareRuntime.copyButton
        ) {

            shareRuntime.copyButton.textContent =
                "Copied";

        }


        window.setTimeout(
            () => {

                if (
                    shareRuntime.status
                ) {

                    shareRuntime.status.textContent =
                        "";

                }


                if (
                    shareRuntime.copyButton
                ) {

                    shareRuntime.copyButton.textContent =
                        "Copy";

                }

            },
            1800
        );


    } else {

        if (
            shareRuntime.status
        ) {

            shareRuntime.status.textContent =
                "Unable to copy link. Select and copy it manually.";

        }


        if (
            shareRuntime.urlInput
        ) {

            shareRuntime.urlInput.focus();

            shareRuntime.urlInput.select();

        }

    }

}


function handleMeetingShareOutsideClick(
    event
) {

    if (
        !shareRuntime.popover
        ||
        shareRuntime.popover.hidden
    ) {

        return;

    }


    if (
        shareRuntime.popover.contains(
            event.target
        )
    ) {

        return;

    }


    if (
        shareRuntime.button
        &&
        shareRuntime.button.contains(
            event.target
        )
    ) {

        return;

    }


    closeMeetingShare();

}


export {

    initializeMeetingShare,

};