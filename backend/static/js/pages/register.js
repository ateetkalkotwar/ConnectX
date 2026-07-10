/* ==========================================================
   CONNECTX REGISTER PAGE
   Version: 1.0
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       ELEMENTS
    ====================================================== */

    const registerForm = document.querySelector(
        "#cx-register-form"
    );

    if (!registerForm) {
        return;
    }


    const firstNameInput = document.querySelector(
        "#first_name"
    );

    const lastNameInput = document.querySelector(
        "#last_name"
    );

    const usernameInput = document.querySelector(
        "#username"
    );

    const emailInput = document.querySelector(
        "#email"
    );

    const passwordInput = document.querySelector(
        "#password"
    );

    const confirmPasswordInput = document.querySelector(
        "#confirm_password"
    );

    const profileImageInput = document.querySelector(
        "#profile_image"
    );

    const termsInput = document.querySelector(
        "#terms"
    );

    const submitButton = document.querySelector(
        "#cx-register-submit"
    );

    const formMessage = document.querySelector(
        "#cx-register-form-message"
    );

    const passwordStrength = document.querySelector(
        "#cx-password-strength"
    );

    const passwordStrengthValue = document.querySelector(
        "#cx-password-strength-value"
    );

    const uploadContainer = document.querySelector(
        "#cx-profile-upload"
    );

    const uploadPreview = document.querySelector(
        "#cx-upload-preview"
    );

    const uploadPlaceholder = document.querySelector(
        "#cx-upload-placeholder"
    );

    const uploadMessage = document.querySelector(
        "#cx-upload-message"
    );


    /* ======================================================
       VALIDATION RULES
    ====================================================== */

    const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]*$/;

    const USERNAME_REGEX = /^[A-Za-z0-9_]{3,30}$/;

    const EMAIL_REGEX =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

    const ALLOWED_IMAGE_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    /* ======================================================
       VALIDATION STATE
    ====================================================== */

    const validationState = {

        firstName: false,

        lastName: false,

        username: false,

        email: false,

        password: false,

        confirmPassword: false,

        profileImage: true,

        terms: false

    };


    /* ======================================================
       FIELD HELPERS
    ====================================================== */

    function getField(input) {

        return input.closest(".cx-field");

    }


    function getFieldMessage(input) {

        const field = getField(input);

        if (!field) {
            return null;
        }

        return field.querySelector(
            ".cx-field-message"
        );

    }


    function clearFieldState(input) {

        const field = getField(input);

        if (!field) {
            return;
        }

        field.classList.remove(
            "cx-field--success",
            "cx-field--error",
            "cx-field--loading"
        );

        const message = getFieldMessage(input);

        if (message) {
            message.textContent = "";
        }

    }


    function setFieldSuccess(input, message = "") {

        const field = getField(input);

        if (!field) {
            return;
        }

        field.classList.remove(
            "cx-field--error",
            "cx-field--loading"
        );

        field.classList.add(
            "cx-field--success"
        );

        const fieldMessage = getFieldMessage(input);

        if (fieldMessage) {
            fieldMessage.textContent = message;
        }

    }


    function setFieldError(input, message) {

        const field = getField(input);

        if (!field) {
            return;
        }

        field.classList.remove(
            "cx-field--success",
            "cx-field--loading"
        );

        field.classList.add(
            "cx-field--error"
        );

        const fieldMessage = getFieldMessage(input);

        if (fieldMessage) {
            fieldMessage.textContent = message;
        }

    }


    /* ======================================================
       FORM MESSAGE
    ====================================================== */

    function showFormMessage(message) {

        if (!formMessage) {
            return;
        }

        const messageText = formMessage.querySelector(
            "[data-form-message]"
        );

        if (messageText) {
            messageText.textContent = message;
        }

        formMessage.classList.add(
            "cx-register-form-message--visible"
        );

    }


    function hideFormMessage() {

        if (!formMessage) {
            return;
        }

        formMessage.classList.remove(
            "cx-register-form-message--visible"
        );

    }


    /* ======================================================
       FIRST NAME VALIDATION
    ====================================================== */

    function validateFirstName() {

        const value = firstNameInput.value.trim();

        validationState.firstName = false;

        if (!value) {

            setFieldError(
                firstNameInput,
                "First name is required."
            );

            return false;

        }

        if (value.length < 2) {

            setFieldError(
                firstNameInput,
                "Enter at least 2 characters."
            );

            return false;

        }

        if (value.length > 50) {

            setFieldError(
                firstNameInput,
                "First name is too long."
            );

            return false;

        }

        if (!NAME_REGEX.test(value)) {

            setFieldError(
                firstNameInput,
                "Enter a valid first name."
            );

            return false;

        }

        validationState.firstName = true;

        setFieldSuccess(
            firstNameInput
        );

        return true;

    }


    /* ======================================================
       LAST NAME VALIDATION
    ====================================================== */

    function validateLastName() {

        const value = lastNameInput.value.trim();

        validationState.lastName = false;

        if (!value) {

            setFieldError(
                lastNameInput,
                "Last name is required."
            );

            return false;

        }

        if (value.length < 2) {

            setFieldError(
                lastNameInput,
                "Enter at least 2 characters."
            );

            return false;

        }

        if (value.length > 50) {

            setFieldError(
                lastNameInput,
                "Last name is too long."
            );

            return false;

        }

        if (!NAME_REGEX.test(value)) {

            setFieldError(
                lastNameInput,
                "Enter a valid last name."
            );

            return false;

        }

        validationState.lastName = true;

        setFieldSuccess(
            lastNameInput
        );

        return true;

    }


    /* ======================================================
       USERNAME VALIDATION
    ====================================================== */

    function validateUsername() {

        const value = usernameInput.value.trim();

        validationState.username = false;

        if (!value) {

            setFieldError(
                usernameInput,
                "Username is required."
            );

            return false;

        }

        if (value.length < 3) {

            setFieldError(
                usernameInput,
                "Username needs at least 3 characters."
            );

            return false;

        }

        if (value.length > 30) {

            setFieldError(
                usernameInput,
                "Username cannot exceed 30 characters."
            );

            return false;

        }

        if (!USERNAME_REGEX.test(value)) {

            setFieldError(
                usernameInput,
                "Use letters, numbers and underscores only."
            );

            return false;

        }

        validationState.username = true;

        setFieldSuccess(
            usernameInput,
            "Username format is valid."
        );

        return true;

    }


    /* ======================================================
       EMAIL VALIDATION
    ====================================================== */

    function validateEmail() {

        const value = emailInput.value.trim();

        validationState.email = false;

        if (!value) {

            setFieldError(
                emailInput,
                "Email address is required."
            );

            return false;

        }

        if (!EMAIL_REGEX.test(value)) {

            setFieldError(
                emailInput,
                "Enter a valid email address."
            );

            return false;

        }

        if (value.length > 254) {

            setFieldError(
                emailInput,
                "Email address is too long."
            );

            return false;

        }

        validationState.email = true;

        setFieldSuccess(
            emailInput,
            "Email format is valid."
        );

        return true;

    }


    /* ======================================================
       PASSWORD REQUIREMENTS
    ====================================================== */

    const passwordRules = {

        length: {

            element: document.querySelector(
                '[data-password-rule="length"]'
            ),

            validate(password) {

                return password.length >= 8;

            }

        },

        uppercase: {

            element: document.querySelector(
                '[data-password-rule="uppercase"]'
            ),

            validate(password) {

                return /[A-Z]/.test(password);

            }

        },

        number: {

            element: document.querySelector(
                '[data-password-rule="number"]'
            ),

            validate(password) {

                return /\d/.test(password);

            }

        },

        special: {

            element: document.querySelector(
                '[data-password-rule="special"]'
            ),

            validate(password) {

                return /[^A-Za-z0-9]/.test(password);

            }

        }

    };


    function updatePasswordRequirements(password) {

        let validRules = 0;

        Object.values(passwordRules).forEach((rule) => {

            const isValid = rule.validate(password);

            if (isValid) {

                validRules += 1;

                rule.element?.classList.add(
                    "cx-password-requirement--valid"
                );

            } else {

                rule.element?.classList.remove(
                    "cx-password-requirement--valid"
                );

            }

        });

        return validRules;

    }


    /* ======================================================
       PASSWORD STRENGTH
    ====================================================== */

    function resetPasswordStrengthClasses() {

        passwordStrength.classList.remove(
            "cx-password-strength--weak",
            "cx-password-strength--fair",
            "cx-password-strength--good",
            "cx-password-strength--strong"
        );

    }


    function updatePasswordStrength() {

        const password = passwordInput.value;

        if (!password) {

            passwordStrength.classList.remove(
                "cx-password-strength--visible"
            );

            resetPasswordStrengthClasses();

            passwordStrengthValue.textContent =
                "Not set";

            updatePasswordRequirements("");

            validationState.password = false;

            return false;

        }

        passwordStrength.classList.add(
            "cx-password-strength--visible"
        );

        const validRules =
            updatePasswordRequirements(password);

        resetPasswordStrengthClasses();

        if (validRules <= 1) {

            passwordStrength.classList.add(
                "cx-password-strength--weak"
            );

            passwordStrengthValue.textContent =
                "Weak";

        } else if (validRules === 2) {

            passwordStrength.classList.add(
                "cx-password-strength--fair"
            );

            passwordStrengthValue.textContent =
                "Fair";

        } else if (validRules === 3) {

            passwordStrength.classList.add(
                "cx-password-strength--good"
            );

            passwordStrengthValue.textContent =
                "Good";

        } else {

            passwordStrength.classList.add(
                "cx-password-strength--strong"
            );

            passwordStrengthValue.textContent =
                "Strong";

        }

        validationState.password =
            validRules === 4;

        return validationState.password;

    }


    function validatePassword() {

        const password = passwordInput.value;

        updatePasswordStrength();

        if (!password) {

            setFieldError(
                passwordInput,
                "Password is required."
            );

            return false;

        }

        if (password.length < 8) {

            setFieldError(
                passwordInput,
                "Password needs at least 8 characters."
            );

            return false;

        }

        if (!/[A-Z]/.test(password)) {

            setFieldError(
                passwordInput,
                "Add at least one uppercase letter."
            );

            return false;

        }

        if (!/\d/.test(password)) {

            setFieldError(
                passwordInput,
                "Add at least one number."
            );

            return false;

        }

        if (!/[^A-Za-z0-9]/.test(password)) {

            setFieldError(
                passwordInput,
                "Add at least one special character."
            );

            return false;

        }

        validationState.password = true;

        setFieldSuccess(
            passwordInput,
            "Strong password."
        );

        return true;

    }


    /* ======================================================
       CONFIRM PASSWORD
    ====================================================== */

    function validateConfirmPassword() {

        const password = passwordInput.value;

        const confirmPassword =
            confirmPasswordInput.value;

        validationState.confirmPassword = false;

        if (!confirmPassword) {

            setFieldError(
                confirmPasswordInput,
                "Please confirm your password."
            );

            return false;

        }

        if (password !== confirmPassword) {

            setFieldError(
                confirmPasswordInput,
                "Passwords do not match."
            );

            return false;

        }

        validationState.confirmPassword = true;

        setFieldSuccess(
            confirmPasswordInput,
            "Passwords match."
        );

        return true;

    }


    /* ======================================================
       PASSWORD VISIBILITY
    ====================================================== */

    function setupPasswordToggle(button) {

        const targetId = button.dataset.passwordTarget;

        const targetInput = document.getElementById(
            targetId
        );

        if (!targetInput) {
            return;
        }

        button.addEventListener("click", () => {

            const isPassword =
                targetInput.type === "password";

            targetInput.type =
                isPassword
                    ? "text"
                    : "password";

            button.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

            button.classList.toggle(
                "cx-password-visible",
                isPassword
            );

        });

    }


    document
        .querySelectorAll("[data-password-target]")
        .forEach(setupPasswordToggle);


    /* ======================================================
       PROFILE IMAGE VALIDATION
    ====================================================== */

    function resetUploadError() {

        uploadContainer.classList.remove(
            "cx-upload--error"
        );

        uploadMessage.textContent = "";

        validationState.profileImage = true;

    }


    function setUploadError(message) {

        uploadContainer.classList.add(
            "cx-upload--error"
        );

        uploadMessage.textContent = message;

        validationState.profileImage = false;

    }


    function clearImagePreview() {

        uploadPreview.removeAttribute("src");

        uploadPreview.hidden = true;

        uploadPlaceholder.hidden = false;

    }


    function validateProfileImage(file) {

        resetUploadError();

        if (!file) {

            clearImagePreview();

            validationState.profileImage = true;

            return true;

        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {

            setUploadError(
                "Use JPG, PNG or WebP images only."
            );

            profileImageInput.value = "";

            clearImagePreview();

            return false;

        }

        if (file.size > MAX_IMAGE_SIZE) {

            setUploadError(
                "Profile image must be smaller than 5 MB."
            );

            profileImageInput.value = "";

            clearImagePreview();

            return false;

        }

        validationState.profileImage = true;

        return true;

    }


    function showImagePreview(file) {

        if (!validateProfileImage(file)) {
            return;
        }

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.addEventListener("load", (event) => {

            uploadPreview.src =
                event.target.result;

            uploadPreview.hidden = false;

            uploadPlaceholder.hidden = true;

        });

        reader.readAsDataURL(file);

    }


    profileImageInput.addEventListener(
        "change",
        () => {

            const file =
                profileImageInput.files[0];

            showImagePreview(file);

        }
    );


    /* ======================================================
       DRAG AND DROP
    ====================================================== */

    [
        "dragenter",
        "dragover"
    ].forEach((eventName) => {

        uploadContainer.addEventListener(
            eventName,
            (event) => {

                event.preventDefault();

                uploadContainer.classList.add(
                    "cx-upload--dragging"
                );

            }
        );

    });


    [
        "dragleave",
        "drop"
    ].forEach((eventName) => {

        uploadContainer.addEventListener(
            eventName,
            (event) => {

                event.preventDefault();

                uploadContainer.classList.remove(
                    "cx-upload--dragging"
                );

            }
        );

    });


    uploadContainer.addEventListener(
        "drop",
        (event) => {

            const files =
                event.dataTransfer.files;

            if (!files.length) {
                return;
            }

            const file = files[0];

            if (!validateProfileImage(file)) {
                return;
            }

            const dataTransfer =
                new DataTransfer();

            dataTransfer.items.add(file);

            profileImageInput.files =
                dataTransfer.files;

            showImagePreview(file);

        }
    );


    /* ======================================================
       TERMS VALIDATION
    ====================================================== */

    function validateTerms() {

        const checkboxContainer =
            termsInput.closest(".cx-checkbox");

        validationState.terms =
            termsInput.checked;

        checkboxContainer.classList.toggle(
            "cx-checkbox--error",
            !termsInput.checked
        );

        return termsInput.checked;

    }


    /* ======================================================
       LIVE INPUT EVENTS
    ====================================================== */

    firstNameInput.addEventListener(
        "input",
        () => {

            hideFormMessage();

            if (
                firstNameInput.value.trim().length >= 2
            ) {

                validateFirstName();

            } else {

                clearFieldState(firstNameInput);

                validationState.firstName = false;

            }

        }
    );


    lastNameInput.addEventListener(
        "input",
        () => {

            hideFormMessage();

            if (
                lastNameInput.value.trim().length >= 2
            ) {

                validateLastName();

            } else {

                clearFieldState(lastNameInput);

                validationState.lastName = false;

            }

        }
    );


    usernameInput.addEventListener(
        "input",
        () => {

            hideFormMessage();

            if (
                usernameInput.value.trim().length >= 3
            ) {

                validateUsername();

            } else {

                clearFieldState(usernameInput);

                validationState.username = false;

            }

        }
    );


    emailInput.addEventListener(
        "input",
        () => {

            hideFormMessage();

            const value =
                emailInput.value.trim();

            if (
                value.includes("@")
            ) {

                validateEmail();

            } else {

                clearFieldState(emailInput);

                validationState.email = false;

            }

        }
    );


    passwordInput.addEventListener(
        "input",
        () => {

            hideFormMessage();

            updatePasswordStrength();

            clearFieldState(passwordInput);

            if (
                confirmPasswordInput.value
            ) {

                validateConfirmPassword();

            }

        }
    );


    confirmPasswordInput.addEventListener(
        "input",
        () => {

            hideFormMessage();

            if (
                confirmPasswordInput.value
            ) {

                validateConfirmPassword();

            } else {

                clearFieldState(
                    confirmPasswordInput
                );

                validationState.confirmPassword =
                    false;

            }

        }
    );


    termsInput.addEventListener(
        "change",
        () => {

            hideFormMessage();

            validateTerms();

        }
    );


    /* ======================================================
       BLUR VALIDATION
    ====================================================== */

    firstNameInput.addEventListener(
        "blur",
        validateFirstName
    );

    lastNameInput.addEventListener(
        "blur",
        validateLastName
    );

    usernameInput.addEventListener(
        "blur",
        validateUsername
    );

    emailInput.addEventListener(
        "blur",
        validateEmail
    );

    passwordInput.addEventListener(
        "blur",
        validatePassword
    );

    confirmPasswordInput.addEventListener(
        "blur",
        validateConfirmPassword
    );


    /* ======================================================
       COMPLETE FORM VALIDATION
    ====================================================== */

    function validateForm() {

        const results = [

            validateFirstName(),

            validateLastName(),

            validateUsername(),

            validateEmail(),

            validatePassword(),

            validateConfirmPassword(),

            validateTerms(),

            validationState.profileImage

        ];

        return results.every(Boolean);

    }


    /* ======================================================
       FIRST INVALID FIELD
    ====================================================== */

    function focusFirstInvalidField() {

        const inputs = [

            firstNameInput,

            lastNameInput,

            usernameInput,

            emailInput,

            passwordInput,

            confirmPasswordInput

        ];

        const invalidInput =
            inputs.find((input) => {

                const field = getField(input);

                return field?.classList.contains(
                    "cx-field--error"
                );

            });

        if (invalidInput) {

            invalidInput.focus();

            invalidInput.scrollIntoView({

                behavior: "smooth",

                block: "center"

            });

            return;

        }

        if (!termsInput.checked) {

            termsInput.focus();

        }

    }


    /* ======================================================
       BUTTON LOADING STATE
    ====================================================== */

    function setButtonLoading(isLoading) {

        submitButton.classList.toggle(
            "cx-btn--loading",
            isLoading
        );

        submitButton.disabled = isLoading;

        submitButton.setAttribute(
            "aria-busy",
            String(isLoading)
        );

    }


    /* ======================================================
       FORM SUBMIT
    ====================================================== */

    registerForm.addEventListener(
        "submit",
        (event) => {

            hideFormMessage();

            const isValid =
                validateForm();

            if (!isValid) {

                event.preventDefault();

                showFormMessage(
                    "Please review the highlighted fields before creating your account."
                );

                focusFirstInvalidField();

                return;

            }

            setButtonLoading(true);

        }
    );


    /* ======================================================
       INITIAL STATE
    ====================================================== */

    clearImagePreview();

    resetUploadError();

    updatePasswordStrength();

});