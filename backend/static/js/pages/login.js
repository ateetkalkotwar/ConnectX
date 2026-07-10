"use strict";


document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById(
        "cx-login-form"
    );

    const loginSubmit = document.getElementById(
        "cx-login-submit"
    );

    const passwordActions = document.querySelectorAll(
        "[data-password-target]"
    );


    /* ======================================================
       PASSWORD VISIBILITY
    ====================================================== */

    passwordActions.forEach((action) => {

        action.addEventListener("click", () => {

            const targetId = action.dataset.passwordTarget;

            const passwordInput = document.getElementById(
                targetId
            );

            if (!passwordInput) {
                return;
            }


            const isPassword =
                passwordInput.type === "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            action.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );


            action.classList.toggle(
                "cx-field-action--active",
                isPassword
            );

        });

    });


    /* ======================================================
       FORM SUBMIT
    ====================================================== */

    if (loginForm && loginSubmit) {

        loginForm.addEventListener("submit", (event) => {

            if (!loginForm.checkValidity()) {

                event.preventDefault();

                loginForm.reportValidity();

                return;

            }


            loginSubmit.disabled = true;

            loginSubmit.setAttribute(
                "aria-busy",
                "true"
            );


            loginSubmit.classList.add(
                "cx-btn--loading"
            );

        });

    }

});