const startProgressBar = function(maxValue) {
    const progressBar = document.getElementById("progress_bar");
    progressBar.className = "w-5";
    progressBar.setAttribute("max_value", maxValue);
}


const updateProgressBar = function(currValue) {
    const progressBar = document.getElementById("progress_bar");
    const maxValue = progressBar.getAttribute("max_value");
    // calculate percentage done to nearest 5%
    const percent = (currValue / maxValue) * 100;
    const percentRounded = Math.round(percent / 5) * 5;

    progressBar.className = `w-${percentRounded}`;
}

const hideProgressBar = function() {
    const progressBar = document.getElementById("progress_bar");
    progressBar.className = "hidden";
}

module.exports = {
  start: startProgressBar,
  update: updateProgressBar,
  hide: hideProgressBar
}