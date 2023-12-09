/*
    REM: `document` is the plugin
         `app.activeDocument` is the InDesign document that's currently active
*/
const ID = require("indesign");
const scripts = require('./scripts');

function handleClickBindingDirection(e) {
  const newBinding = (e.target.value == "LEFT_TO_RIGHT") 
                      ? ID.PageBindingOptions.LEFT_TO_RIGHT
                      : ID.PageBindingOptions.RIGHT_TO_LEFT;
  app.activeDocument.documentPreferences.pageBinding = newBinding;
}

function setupBindingDirection() {
  if (!app.activeDocument) { return }
  const currentBinding = app.activeDocument.documentPreferences.pageBinding;

  // Not sure when this is used, but it's possible
  if (currentBinding == ID.PageBindingOptions.DEFAULT_VALUE)
    currentBinding = ID.PageBindingOptions.LEFT_TO_RIGHT;

  const currentBindingValue = currentBinding.toString();
  const bindingDirection = document.querySelector('#binding_direction');

  bindingDirection.value = currentBindingValue;
  bindingDirection.querySelector(`.${currentBindingValue}`).checked = true;
}

function setupFields(){
  setupBindingDirection();
}

function setupClickBindings(){
  document.querySelector('#binding_direction').addEventListener("change", handleClickBindingDirection);

  document.querySelector("#adjust-size-and-leading .increase").onclick = scripts.adjustSizeAndLeading.increase;
  document.querySelector("#adjust-size-and-leading .decrease").onclick = scripts.adjustSizeAndLeading.decrease;
  document.querySelector("#skew-frame .left").onclick  = scripts.skewFrame.left;
  document.querySelector("#skew-frame .right").onclick = scripts.skewFrame.right;
  document.getElementById("refit-overset-frames").onclick = scripts.refitOversetFrames;
  document.getElementById("scale-pages").onclick = scripts.scalePages;
  document.getElementById("position-art").onclick = scripts.positionArt;
  document.getElementById("manga-em-dash").onclick = scripts.mangaEmDash;
  document.getElementById("pseudo-stroke").onclick = scripts.pseudoStroke;
}

function main(){
  if (!app.activeDocument) { return }

  setupFields();
  setupClickBindings();

  app.activeDocument.addEventListener("key", (e) => {console.log(e)})
}

main();
