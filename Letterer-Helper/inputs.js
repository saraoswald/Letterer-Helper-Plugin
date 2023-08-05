/*
    REM: `document` is the plugin
         `app.activeDocument` is the InDesign document that's currently active
*/
const ID = require('./constants');
const scripts = require('./scripts');

function handleClickBindingDirection(e) {
  const newBinding = (e.target.value == "LEFT_TO_RIGHT") 
                      ? ID.PageBindingOptions.LEFT_TO_RIGHT
                      : ID.PageBindingOptions.RIGHT_TO_LEFT;
  app.activeDocument.documentPreferences.pageBinding = newBinding;
}

function setupBindingDirection() {
  if (!app.activeDocument) { return }
  const bindingDirections = document.querySelectorAll('#binding_direction input');
  const currentBinding = app.activeDocument.documentPreferences.pageBinding;

  // Not sure when this is used, but it's possible
  if (currentBinding == ID.PageBindingOptions.DEFAULT_VALUE)
    currentBinding = ID.PageBindingOptions.LEFT_TO_RIGHT;

  document.getElementById(`binding_direction_${currentBinding}`).checked = true;
  bindingDirections.forEach((ele) => ele.onclick = handleClickBindingDirection);
}

function setupAdjustSizeAndLeading(){
  document.querySelector("#adjust-size-and-leading .increase").onclick = scripts.adjustSizeAndLeading.increase;
  document.querySelector("#adjust-size-and-leading .decrease").onclick = scripts.adjustSizeAndLeading.decrease;
}

function main(){
  setupBindingDirection();
  setupAdjustSizeAndLeading();
}

main();
