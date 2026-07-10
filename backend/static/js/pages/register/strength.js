document.addEventListener("DOMContentLoaded", () => {

    const password = document.getElementById("password");

    const bar = document.getElementById("strength-bar");

    const rules = {

        length: document.getElementById("rule-length"),

        upper: document.getElementById("rule-upper"),

        lower: document.getElementById("rule-lower"),

        number: document.getElementById("rule-number"),

        special: document.getElementById("rule-special")

    };

    password.addEventListener("input", () => {

        let score = 0;

        const value = password.value;

        if(value.length >= 8){

            score++;

            rules.length.innerHTML="✅ Minimum 8 characters";

        }

        else{

            rules.length.innerHTML="❌ Minimum 8 characters";

        }

        if(/[A-Z]/.test(value)){

            score++;

            rules.upper.innerHTML="✅ One uppercase letter";

        }

        else{

            rules.upper.innerHTML="❌ One uppercase letter";

        }

        if(/[a-z]/.test(value)){

            score++;

            rules.lower.innerHTML="✅ One lowercase letter";

        }

        else{

            rules.lower.innerHTML="❌ One lowercase letter";

        }

        if(/[0-9]/.test(value)){

            score++;

            rules.number.innerHTML="✅ One number";

        }

        else{

            rules.number.innerHTML="❌ One number";

        }

        if(/[!@#$%^&*(),.?\":{}|<>]/.test(value)){

            score++;

            rules.special.innerHTML="✅ One special character";

        }

        else{

            rules.special.innerHTML="❌ One special character";

        }

        const width = (score/5)*100;

        bar.style.width = width + "%";

        if(score<=2){

            bar.style.background="#EF4444";

        }

        else if(score<=4){

            bar.style.background="#F59E0B";

        }

        else{

            bar.style.background="#22C55E";

        }

    });

});