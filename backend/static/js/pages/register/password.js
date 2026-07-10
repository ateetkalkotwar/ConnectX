document.addEventListener("DOMContentLoaded", () => {

    const passwordToggles = document.querySelectorAll(".cx-password-toggle");

    passwordToggles.forEach(toggle => {

        toggle.addEventListener("click", () => {

            const input = toggle.previousElementSibling;

            if (input.type === "password") {

                input.type = "text";

                toggle.textContent = "🙈";

            }

            else {

                input.type = "password";

                toggle.textContent = "👁";

            }

        });

    });

});