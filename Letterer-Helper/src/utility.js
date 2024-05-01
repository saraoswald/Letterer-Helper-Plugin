function closeDialog(dialog) {
    return (_event) => {
        dialog.close();
    }
}

function updateProgressBar(progress) {
    const dialog = document.getElementById("dialog");

    dialog.querySelector(".overlay.loading sp-progressbar").setAttribute("value", progress);
}

const showDialog = function(message, title) {
    const dialog = document.querySelector("dialog");
  
    dialog.querySelector(".title").innerHTML = title || "";
    dialog.querySelector(".message").innerHTML = message || "";
    dialog.show();
  
    dialog.querySelector(".close").onclick = closeDialog(dialog);
}

module.exports = {
    showDialog
}