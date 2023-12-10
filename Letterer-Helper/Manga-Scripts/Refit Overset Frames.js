// ----------- Refit Overset Frames ----------- // 
/* 
    Refits all of the overflowing frames on either the current page or all pages. 

    Usage Instructions: 
    - Select one or many text frames that are overset
    - Run this script

    This is the same thing as doing `Object > Fitting > Fit Frame to Content`, but on a bunch of text frames at once. 
    UPDATE: Now the script will expand the frame by 1 pixel until it's no longer overset

    Installation Instructions: https://github.com/saraoswald/Manga-Scripts/#how-to-use-scripts-in-indesign

    Nov 21 2020, Sara Linsley
*/

const progressBar = require('./progress_bar.js');

/* ------ Start of Script ------ */

const myDisplayDialog = function() {
    var doc = app.activeDocument;
    var usersUnits = app.scriptPreferences.measurementUnit; // so we can revert 'em back later
    app.scriptPreferences.measurementUnit = ID.MeasurementUnits.PIXELS;

    var myDialog = app.dialogs.add({ name: "Refit Overset Frames" });
    var pageRangeControl;
    with(myDialog) {
        with(dialogColumns.add()) {
            staticTexts.add({ staticLabel: "Fit all the overset frames on:" });
            pageRangeControl = radiobuttonGroups.add();
            with(pageRangeControl) {
                radiobuttonControls.add({ staticLabel: "All Pages", checkedState: 0 });
                radiobuttonControls.add({ staticLabel: "This Page", checkedState: 1 });
            }
            staticTexts.add({ staticLabel: '' });
        }
    }
    var myReturn = myDialog.show();
    if (myReturn == true) {
        try {
            if (pageRangeControl.selectedButton === 0) { // if "All Pages" is selected
                var pageCount = doc.pages.count();
                progressBar.start(pageCount);
                for (var i = 0; i < pageCount; i++) {
                    fitFramesOnPage(doc.pages.item(i));
                    progressBar.update(i + 1);
                }
                progressBar.hide();
            } else { // if "This Page" is selected 
                fitFramesOnPage(app.activeWindow.activePage);
            }
        } catch (err) { console.log(err) }

    } else {
        myDialog.destroy();
    }
    app.scriptPreferences.measurementUnit = usersUnits;
}

// on a given page, loops through all the text frames
// if any of the text frames are overset, refit the frame to accomodate the content
const fitFramesOnPage = function(page) {
    try {
        var textFrames = page.textFrames;
        for (var i = 0; i < textFrames.count(); i++) {
            var frame = textFrames.item(i);
            if (!!frame && frame.overflows) {
                // try using InDesign's default Fit Frame to Content feature
                frame.fit(ID.FitOptions.FRAME_TO_CONTENT);
                // if it doesn't work, expand the frame manually
                if (frame.overflows) {
                    doFit(frame);
                }
            }
        }
    } catch (err) { console.log(err) }
}

// recursive function that nudges the frame bounds out by 1
// until the frame is no longer overset
const doFit = function(frame) {
    if (!!frame && !frame.overflows) return;
    expandFrame(frame, 5);
    doFit(frame);
}

// expands a given frame by a given unit
const expandFrame = function(frame, by) {
    frame.geometricBounds = transformCoords(frame.geometricBounds, [by * -1, by * -1, by, by]);
}

// applies transformations in the format [y1, x1, y2, x2]
const transformCoords = function(src, trns) {
    return [
        src[0] + trns[0],
        src[1] + trns[1],
        src[2] + trns[2],
        src[3] + trns[3]
    ];
}

const main = function(){
    try {
        myDisplayDialog();
    } catch (error) {
        console.log(error);
    }
}

module.exports = { main }