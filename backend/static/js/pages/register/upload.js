document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("profile-image");

    const preview = document.getElementById("preview-image");

    input.addEventListener("change", function(){

        const file = this.files[0];

        if(file){

            preview.src = URL.createObjectURL(file);

        }

    });

});