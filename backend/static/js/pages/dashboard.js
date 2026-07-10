"use strict";


document.addEventListener("DOMContentLoaded", () => {

    const dashboardDay = document.getElementById(
        "cx-dashboard-day"
    );

    const dashboardDate = document.getElementById(
        "cx-dashboard-date"
    );


    /* ======================================================
       DASHBOARD DATE
    ====================================================== */

    const currentDate = new Date();


    if (dashboardDay) {

        dashboardDay.textContent =
            currentDate.toLocaleDateString(
                undefined,
                {
                    weekday: "long"
                }
            );

    }


    if (dashboardDate) {

        dashboardDate.textContent =
            currentDate.toLocaleDateString(
                undefined,
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

    }

});