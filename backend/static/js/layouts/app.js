"use strict";


document.addEventListener("DOMContentLoaded", () => {

    const appShell = document.getElementById(
        "cx-app-shell"
    );

    const sidebarOpen = document.getElementById(
        "cx-sidebar-open"
    );

    const sidebarClose = document.getElementById(
        "cx-sidebar-close"
    );

    const sidebarOverlay = document.getElementById(
        "cx-sidebar-overlay"
    );


    /* ======================================================
       SIDEBAR STATE
    ====================================================== */

    const openSidebar = () => {

        if (!appShell) {
            return;
        }

        appShell.classList.add(
            "cx-sidebar-open"
        );

        document.body.style.overflow = "hidden";

        if (sidebarOpen) {

            sidebarOpen.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    };


    const closeSidebar = () => {

        if (!appShell) {
            return;
        }

        appShell.classList.remove(
            "cx-sidebar-open"
        );

        document.body.style.overflow = "";

        if (sidebarOpen) {

            sidebarOpen.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    };


    /* ======================================================
       SIDEBAR EVENTS
    ====================================================== */

    if (sidebarOpen) {

        sidebarOpen.addEventListener(
            "click",
            openSidebar
        );

    }


    if (sidebarClose) {

        sidebarClose.addEventListener(
            "click",
            closeSidebar
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );

    }


    /* ======================================================
       ESCAPE KEY
    ====================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {

                closeSidebar();

            }

        }
    );


    /* ======================================================
       WINDOW RESIZE
    ====================================================== */

    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 1024) {

                closeSidebar();

            }

        }
    );

});