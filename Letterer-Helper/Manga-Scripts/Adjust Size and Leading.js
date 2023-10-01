// ----------- Adjust Size and Leading - Decrease ----------- // 
/* 
    Increases the size and leading of a selected text frame by the user's leading setting. 
        - Change this setting in Preferences > Units & Increments > Keyboard Increments > Size/Leading

    This is a sister script to "Adjust Size and Leading - Increase" 

    Updated: Aug 5 2023 - Sara Linsley
*/

const doAdjust = function(isIncrease) {
    var hasErrors = false,
        selections = app.selection;

    for (var i = 0; i < selections.length && !hasErrors; i++) {
        var textFrame = selections[i].constructorName == "InsertionPoint" ?
            selections[i].parentTextFrames[0] :
            selections[i];
        // use the document's increment setting for convenience
        var increment = app.activeDocument.textPreferences.leadingKeyIncrement;
        // increase the leading and font size for all the paragraphs in the frame
        var modifier = isIncrease ? 1 : -1;
        forEach(textFrame.paragraphs, adjustSizeAndLeading(increment * modifier));
    }
}

const adjustSizeAndLeading = function(increment) {
    return function(paragraph) {
        // Increase the font size
        paragraph.pointSize = paragraph.pointSize + increment;

        // Increase the leading size
        var currentLeadingValue = paragraph.leading;
        // if the leading is already set to "Auto", then compute the current leading value
        if (!parseInt(paragraph.leading)) {
            currentLeadingValue = (paragraph.autoLeading / 100) * paragraph.pointSize;
        }
        // add increment to current value
        paragraph.leading = currentLeadingValue + increment;
    }
}

// basically Array.forEach
const forEach = function(arr, fn) {
    for (var i = 0; i < arr.count(); i++) {
        fn(arr.item(i));
    }
}

const increase = () => doAdjust(true) 
const decrease = () => doAdjust(false)

module.exports = { decrease, increase }