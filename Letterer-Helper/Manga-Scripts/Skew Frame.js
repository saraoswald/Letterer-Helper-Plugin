// ----------- Skew Frame ----------- // 
/* 
    Increments the Rotation and Shear X Angle of a text frame by the same amount
*/

var doc = app.activeDocument;

function doSkew(skewFactor) {
    var hasErrors = false,
        selections = app.selection;

    for (var i = 0; i < selections.length && !hasErrors; i++) {
        var textFrame = selections[i];
        var frameHasErrors = isError(textFrame);
        hasErrors = hasErrors || frameHasErrors;

        if (!frameHasErrors) {
            textFrame.absoluteRotationAngle += skewFactor;
            textFrame.absoluteShearAngle += skewFactor;
        };
    }

    if (hasErrors) {
        console.log('Some selections were not text frames and were skipped');
    }
}

function isError(obj) {
    if (obj.constructorName !== "TextFrame") {
        return true;
    }
    return false;
}

const left  = () => doSkew(-1);
const right = () => doSkew(1);

module.exports = { left, right }