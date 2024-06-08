const localStorage = window.localStorage;
// const sessionStorage = window.sessionStorage;
const util = require('./utility');

const debugMode = false;

const defaultCharacterStyleBold = {
  name: "Bold",
  fontStyle: "Bold",
};
const defaultCharacterStyleItalic = {
  name: "Italic",
  fontStyle: "Italic",
}
const defaultCharacterStyleBoldItalic = {
  name: "Bold Italic",
  fontStyle: "Bold Italic",
}

let characterStyleBold = undefined,
  characterStyleItalic = undefined,
  characterStyleBoldItalic = undefined;

app.scriptPreferences.measurementUnit = ID.MeasurementUnits.PIXELS;


// NOTE: this is specific to a given file
function fetchData(key) {
  let data = localStorage.getItem(currentFile); // string
  if (!data) return;

  data = JSON.parse(data); // object

  return data[key];
}

// NOTE: this is specific to a given file
function setData(key, value) {
  let data = localStorage.getItem(currentFile); // string
  
  if (!data) data = {}
  else data = JSON.parse(data); // object

  data[key] = value;

  data = JSON.stringify(data); // back to string
  localStorage.setItem(currentFile, data);
}

let currentScript, currentFile;

function resetData(fileName) {
  // localStorage.setItem(fileName, ""); // empty out the storage for this file
  currentFile = fileName;
}

function resetDialog(){
  resetData();
  stopPasting();
}

// ----------------------
//    Settings Overlay
// ----------------------

function toggleSettings() {
  const panel = document.getElementById("typeset_tool"),
    overlay = panel.querySelector(".overlay.settings");

  const isOpen = overlay.style.display != "none";

  panel.classList.toggle("settings_open"); 
  
  overlay.style.display = isOpen ? "none" : "";

  // scroll the selection back into view on close
  if (isOpen && !!selection) selection.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

// apply previous settings to the UI
const settingsList = ["setting_paste_mode", "setting_fit_overset_frames"];
const settingsDefaults = {
  "setting_paste_mode": "paste_rich",
  "setting_fit_overset_frames": "always"
};
function setupSettings() {
  const settingsOverlay = document.querySelector(".overlay.settings .settings_body");
  settingsList.forEach( settingID => {
    // check if setting exists
    let settingValue = localStorage.getItem(settingID);
    if (debugMode) console.log(settingID + " - " + settingValue);
    
    // if not, then set the data to the default
    if (!settingValue) {
      settingValue = settingsDefaults[settingID]
      localStorage.getItem(settingID, settingValue);
      if (debugMode) console.log("Set to default value: " + settingValue);
    }
    // apply value to UI
    settingsOverlay.querySelector(`#${settingID}`).value = settingValue;
    settingsOverlay.querySelector(`#${settingID} .${settingValue}`).checked = true;
  })
}

function handleSettingChange(e) {
  if (debugMode) console.log(e.target.id + " - " + e.target.value);
  localStorage.setItem(e.target.id, e.target.value);
}


// ----------------------
//  End Settings Overlay
// ----------------------


async function getText() {
  // Ask user to select a file
  if (fsProvider.isFileSystemProvider) {

    try {
      const file = await fsProvider.getFileForOpening({ types: [ "txt", "rtf" ] });
      if (!file) { 
        togglePanelLoading();
        return false;
      } // no file selected

      let text;
      try {
        text = await file.read(); // try utf-8 encoding
      } catch (textError){
        text = await file.read({format: formats.binary}); // try binary encoding
        // if that doesn't work, the parent try/catch will show an error
      }

      stopPasting();
      togglePanelLoading();

      resetData(file.name);
      
      return parseScript(text, file.name);
    } catch (err) {
      console.log(err);
      if (!text) util.showDialog("An error occurred while loading the script file.<br>" + err.message, "Error");
    }
  }
}

/* 
  Parses script into this shape:
    {
      1: {
        1.1: [
          ["Caption:", "It is a truth universally acknowledged, that a…"],
          ["Mrs. Bennet:", "My dear Mr. Bennet,"]
        ]
      }
      2: {
        2.1: [
          ["Mrs. Bennet:", "You must know that I am thinking of his marrying one…"],
          ["Mrs. Bennet/aside:", "You have no compassion on my poor nerves."]
        ]
      }
    }
*/
function parseScript(script, fileName) {
  currentScript = {};
  // TODO: try to guess the shape of the script + support more types

  let fileType = fileName.split('.').pop();
  try {
    if (fileType == "txt") { 
      return parseTxt(script);
    } else if (fileType == "rtf") {
      return parseRtf(script);
    }
  } catch (err) {
    console.log(err);
    util.showDialog("An error occurred while parsing the script.<br>" + err.message, "Error");
    return false;
  }
}

function parseRtf(script) {
  // change all curly quotes to straight
  // the RTF parser doesn't handle them... TODO: fix?
  script = script.replaceAll(/\\'9[12]/gi, "'"); // replace singles
  script = script.replaceAll(/\\'9[34]/gi, "\""); // replace doubles
  // console.log(script);

  const rtfParser = require('./rtf2html/index.js');
  const scriptHTML = rtfParser(script);

  return parseTxt(scriptHTML);
}

function parseTxt(script) {
  const lines = script.split("\n");
  let parsedScript = {},
      columnsCount = 1,
      lastPanelNum = 0.0,
      lastPageNum = 0;
  
  lines.forEach( line => {
    if (line.length < 1 || line.toLowerCase().startsWith("page")) return;

    // remove newlines
    line = line.replaceAll(/(\r\n|\n|\r)/gm, "");

    let lineData = line.split('\t'),
      panelNum = parseFloat(lineData[0]) || lastPanelNum,
      pageNum = Math.floor(panelNum);

    // if no page number is provided, storebought is fine
    if (!pageNum) pageNum = lastPageNum
    else if (pageNum != lastPageNum) lastPageNum = pageNum;
    lastPanelNum = panelNum; // update which panel was processed last

    let pageData = parsedScript[pageNum] || {},
        panelData = pageData[panelNum] || [];
    // pop out panel number if it's in there
    if (parseFloat(lineData[0]) || lineData[0] == "") lineData.shift();
    // add the line data into the panel 
    panelData.push(lineData);
    // update the max number of columns
    if (columnsCount < lineData.length) columnsCount = lineData.length;
    // update panel in the page
    pageData[panelNum] = panelData;
    // update the page in the whole script
    parsedScript[pageNum] = pageData;
  })

  console.log(parsedScript);
  return [parsedScript, columnsCount];
}

function setupTable(parsedScript, columnsCount) {
  if (!parsedScript) return; 
  
  try {
    // DOM elements
    const panel = document.getElementById("typeset_tool"),
      overlay = panel.querySelector('.overlay'),
      controls = panel.querySelector('.control_wrapper'),
      tableWrapper = panel.querySelector(".table_wrapper"),
      tableHead = tableWrapper.querySelector(".table_head"),
      tableBody = tableWrapper.querySelector(".table_body");
    // templates
    const templateHead = panel.querySelector("#template_head div").cloneNode(true), // true == deep clone
      templatePage = panel.querySelector("#template_page div").cloneNode(true),
      templatePanel = templatePage.querySelector('.table_page_panel').cloneNode(true),
      templateLine = templatePanel.querySelector(".table_row").cloneNode(true),
      templateCell = templateLine.querySelector(".table_cell").cloneNode(true);

    // lightly adapted from source: https://stackoverflow.com/questions/58660470/resizing-column-width-on-a-table
    function setListeners(div) {
      let pageX, curCol, curColWidth;

      div.addEventListener('mousedown', function(e) { 
        curCol = e.target.parentElement;
        pageX = e.pageX;

        let padding = paddingDiff(curCol);

        curColWidth = curCol.offsetWidth - padding;
      });

      document.addEventListener('mousemove', function(e) {
        if (curCol) {
          let diffX = e.pageX - pageX,
              newWidth = (curColWidth + diffX) + 'px',
              columnId = curCol.getAttribute("column-id"),
              cells = tableWrapper.querySelectorAll(`.table_cell[column-id="${columnId}"]`);

          cells.forEach(cell => { 
            cell.style.minWidth = newWidth;
            cell.style.maxWidth = newWidth;
          });
        }
      });

      document.addEventListener('mouseup', function(e) {
        curCol = undefined;
        pageX = undefined;
        curColWidth = undefined
      });
    }

    function paddingDiff(col) {
      if (getStyleVal(col, 'box-sizing') == 'border-box') {
        return 0;
      }

      var padLeft = getStyleVal(col, 'padding-left');
      var padRight = getStyleVal(col, 'padding-right');
      return (parseInt(padLeft) + parseInt(padRight));

    }

    function getStyleVal(elm, css) {
      return (window.getComputedStyle(elm, null).getPropertyValue(css))
    }
    // end stackoverflow source

    // fill table header
    tableHead.innerHTML = "";
    let thisHeader;
    for ( let i = 0; i < columnsCount; i++ ) {
      thisHeader = templateHead.cloneNode(true);
      thisHeader.querySelector(".table_column_name").innerHTML = i + 1;
      thisHeader.setAttribute("column-id", i);

      setListeners(thisHeader);

      tableHead.appendChild(thisHeader);
    }

    // fill table body
    tableBody.innerHTML = "";
    Object.entries(parsedScript).forEach( (page, pageIndex) => {
      let pageNum = page[0],
          pageData = page[1],
          rowIndex = 0,
          thisPage = templatePage.cloneNode(true);

      thisPage.removeChild(thisPage.querySelector(".table_page_panel"));
      thisPage.querySelector(".page_num").innerHTML = pageNum;

      Object.entries(pageData).forEach( (panel, panelIndex) => {
        let panelData = panel[1],
            panelNum = panel[0],
            thisPanel = templatePanel.cloneNode(true);
        thisPanel.querySelector(".panel_num").innerHTML = panelNum;
        thisPanel.removeChild(thisPanel.querySelector(".table_row"));

        panelData.forEach( (line, lineIndex) => {
          let thisLine = templateLine.cloneNode(true);
              thisLine.innerHTML = "";
          
          line.forEach( (cell, cellIndex) => {
            let thisCell = templateCell.cloneNode(true),
                cellId = `${pageIndex}-${panelIndex}-${lineIndex}-${cellIndex}`;
            thisCell.setAttribute("page-id", pageIndex);
            thisCell.setAttribute("cell-id", cellId);
            thisCell.setAttribute("row-id", rowIndex);
            thisCell.setAttribute("column-id", cellIndex);
            thisCell.innerHTML = cell + (!debugMode ? "" :  " [" + [pageIndex, cellIndex, rowIndex].join(", ") + "]");
            thisLine.appendChild(thisCell);
            thisCell.onclick = changeSelection;

            // store the value in global hash
            currentScript[cellId] = cell;
          }) // forEach cell

          if (line.length > 0) rowIndex++; // increment row index
          thisPanel.appendChild(thisLine);
        }); // forEach line

        thisPage.appendChild(thisPanel);
      }) // forEach panel

      tableBody.appendChild(thisPage);
    }) // forEach page

    overlay.style.display = "none";
    tableWrapper.style.display = "";
    controls.style.display = "";
    controls.classList.remove("closed");

    togglePanelLoading();

  } catch(err) { 
    console.log(err);
    util.showDialog("An error occurred while setting up the script table.<br>" + err.message, "Error");
  }
}

function togglePanelLoading(isLoading) {
  let panel = document.getElementById("typeset_tool"),
      overlay = panel.querySelector(".overlay.loading");

  if (isLoading !== undefined) {
    // if given a value, use that
    isLoading ? panel.classList.add("loading") : panel.classList.remove("loading");

  } else {
    // otherwise just toggle, return value is whether or not the class was added 
    isLoading = panel.classList.toggle("loading"); 
  }

  overlay.style.display = isLoading ? "" : "none";
}

var isPasting = false,
    selection = null;

function startPasting() {
  try {
    isPasting = true;

    let panel = document.getElementById("typeset_tool");
    panel.querySelector(".control_wrapper .start").style.display = "none";
    panel.querySelector(".control_wrapper .stop").style.display = "";

    const lastSelection = fetchData("lastSelection");
    let thisSelection = null;
    if (lastSelection) {
      thisSelection = panel.querySelector('.table_body').querySelector(`.table_cell[cell-id="${lastSelection}"]`);
      thisSelection.classList.add("history-selection");
    } else if (selection) {
      thisSelection = selection;
    } else {
      // select the first cell 
      thisSelection = panel.querySelector('.table_body').querySelector(".table_cell");
    }
    setSelection(thisSelection);

    panel.querySelector(".table_wrapper").classList.add("pasting");
  } catch(err) { 
    console.log(err);
    util.showDialog("An error occurred while starting to paste.<br>" + err.message, "Error");
  }
}

function stopPasting() {
  isPasting = false;

  let panel = document.getElementById("typeset_tool");
  panel.querySelector(".control_wrapper .start").style.display = "";
  panel.querySelector(".control_wrapper .stop").style.display = "none";

  if (selection) {
    setData("lastSelection", selection.getAttribute('cell-id'));
  }

  setSelection(undefined);
  
  panel.querySelector(".table_wrapper").classList.remove("pasting");
}

function changeSelection(e) {
  if (!isPasting) return;

  let target = e.target.closest(".table_cell");

  document.querySelectorAll('.table_cell.history-selection').forEach( cell => cell.classList.remove("history-selection"));

  setSelection(target);
}

function setSelection(cell){
  let panel = document.getElementById("typeset_tool");
  panel.querySelector(".table_body").querySelectorAll(".table_cell.selected").forEach( cell => cell.classList.remove("selected") );
    
  selection = cell;

  if (!cell) return; // skip if empty

  selection.classList.add("selected");
  selection.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

function goToNextCell(direction = "next") {
  const pageId = selection.getAttribute("page-id"),
    colId = selection.getAttribute("column-id"),
    rowId = selection.getAttribute("row-id"),
    increment = (direction == "prev") ? -1 : 1;
  
  // try going to the next row
  let query = `.table_cell[page-id="${pageId}"][column-id="${colId}"][row-id="${parseInt(rowId) + increment}"]`,
    newSelection = document.querySelector("#typeset_tool .table_body").querySelector(query);

  // if empty, try the next next row
  if (!newSelection) {
    query = `.table_cell[page-id="${pageId}"][column-id="${colId}"][row-id="${parseInt(rowId) + (increment * 2)}"]`;
    newSelection = document.querySelector("#typeset_tool .table_body").querySelector(query);
  }
  
  // if empty, go to next page in the same column
  if (!newSelection) {
    query = `.table_cell[page-id="${parseInt(pageId) + increment}"][column-id="${colId}"][row-id="0"]`;
    newSelection = document.querySelector("#typeset_tool .table_body").querySelector(query);
  }

  // if STILL empty, try the second row in the next page
  if (!newSelection) {
    query = `.table_cell[page-id="${parseInt(pageId) + increment}"][column-id="${colId}"][row-id="1"]`;
    newSelection = document.querySelector("#typeset_tool .table_body").querySelector(query);
  }

  // if STILL empty, try the previous column
  if (!newSelection) {
    query = `.table_cell[page-id="${parseInt(pageId) + increment}"][column-id="${colId - 1}"][row-id="1"]`;
    newSelection = document.querySelector("#typeset_tool .table_body").querySelector(query);
  }
    
  setSelection(newSelection);
  
  return newSelection;
}

// TODO: store progress for each file, and skip to the last used line on load

function loadScript() {
  const textPromise = getText();

  textPromise.then((data) => { 
    if (!data) { // no file selected, or there was an issue with the file
      togglePanelLoading();
    } else {
      setupTable(...data);
    }
  });
}

function selectionChanged() {
  const doc = app.activeDocument;
  if (isPasting && doc.selection[0] instanceof ID.TextFrame && doc.selection[0].contents == '' && doc.selection[1] == null) {
    pasteText();
  }
}

// recursive function that nudges the frame bounds out by 1
// until the frame is no longer overset
const doFit = function(frame) {
  if (!!frame && !frame.overflows) return;
  expandFrame(frame, 1);
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

function applyTextStyles(textFrame) {
  const doc = app.activeDocument;
  // Check to see if the Character Style already exists
  if (!characterStyleBold) {
    var existingStyleBold = doc.characterStyles.itemByName(defaultCharacterStyleBold.name);
    characterStyleBold = existingStyleBold.isValid ?
        existingStyleBold :
        doc.characterStyles.add(defaultCharacterStyleBold);
  }
  if (!characterStyleItalic) {
    var existingStyleItalic = doc.characterStyles.itemByName(defaultCharacterStyleItalic.name);
    characterStyleItalic = existingStyleItalic.isValid ?
        existingStyleItalic :
        doc.characterStyles.add(defaultCharacterStyleItalic);
  }
  if (!characterStyleBoldItalic) {
    var existingStyleBoldItalic = doc.characterStyles.itemByName(defaultCharacterStyleBoldItalic.name);
    characterStyleBoldItalic = existingStyleBoldItalic.isValid ?
        existingStyleBoldItalic:
        doc.characterStyles.add(defaultCharacterStyleBoldItalic);
  }
  
  doApplyTextStyles(textFrame, "<b>", "</b>", characterStyleBold);
  doApplyTextStyles(textFrame, "<i>", "</i>", characterStyleItalic);
}


function doApplyTextStyles(textFrame, modifierStart, modifierEnd, characterStyle) {
  // todo: this is slow
  var characters = textFrame.characters;
  var testString, start, end;

  // if frame is overflowing/overset, then refit
  // overset text isn't formattable
  var fitOversetFramesSetting = localStorage.getItem("setting_fit_overset_frames");
  if (textFrame.overflows && ((!fitOversetFramesSetting || fitOversetFramesSetting != "only_rich_text") || textFrame.contents.match(/<.+>/))) {
    doFit(textFrame);
  }
  for (i = 0; i < characters.count() - modifierEnd.length; i++) {
    start = undefined;
    testString = characters.itemByRange(i, i + modifierStart.length - 1).contents.join("").toLowerCase();
    if (testString == modifierStart) {
      start = i + modifierStart.length;
      end = undefined;
      
      for (j = start; end == undefined && j < characters.count() - modifierEnd.length + 1; j++) {
        testString = characters.itemByRange(j, j + modifierEnd.length - 1).contents.join("").toLowerCase();
        if (end == undefined && testString == modifierEnd) {
          end = j - 1;
        }
      }

      // tag that has no closer
      if (start != undefined && end == undefined) {
        end = characters.count() - 1;
      }

      if (start != undefined && end != undefined) {
        let boldItalicList = [];
        // apply Bold Italic if some text is already bold and we're adding italic
        if (characterStyle.name == characterStyleItalic.name) {
          let boldItalStart = undefined;
          // check for bold italic styling, put boldital blocks in an array
          for(let k = start; k <= end; k++) {
            let char = characters.item(k);
            if (!boldItalStart && char.appliedCharacterStyle.name == characterStyleBold.name) {
              boldItalStart = k;
            } else if(!!boldItalStart && char.appliedCharacterStyle.name != characterStyleBold.name) { 
              boldItalicList.push([boldItalStart, k]);
              boldItalStart = undefined;
            } else if (!!boldItalStart && k == end) {
              boldItalicList.push([boldItalStart, k]);
            }
          }
        }

        characters.itemByRange(start, end).applyCharacterStyle(characterStyle);
        // assign boldital style 
        boldItalicList.forEach((pair) => {
          characters.itemByRange(...pair).applyCharacterStyle(characterStyleBoldItalic);
        });

        if (textFrame.overflows) {
          doFit(textFrame);
        }
        
        // remove tags
        // make sure there was an end tag first... 
        var endTag = characters.itemByRange(end + 1, end + modifierEnd.length);
        if (endTag.isValid) {
          characters.itemByRange(end + 1, end + modifierEnd.length).remove();
        }
        characters.itemByRange(i, start - 1).remove();
      }
    }
  }
}

function pasteText() {
  if (!currentScript || !selection) return;
  const doc = app.activeDocument,
    cellId = selection.getAttribute("cell-id");

  let textToPlace = currentScript[cellId];
  let textFrame = doc.selection[0];
  // textToPlace = decodeURI(textToPlace); // unescape HTML (like quotes)

  // respect the setting for paste mode
  const pasteModeSetting = localStorage.getItem("setting_paste_mode");
  if (pasteModeSetting == "paste_rich" || !pasteModeSetting) {
    // place text, then format + remove tags
    textFrame.contents = textToPlace;
    applyTextStyles(textFrame);
  } else {
    // remove html tags, then place text
    textToPlace = textToPlace.replace(/<\/?[^>]+(>|$)/g, "");
    textFrame.contents = textToPlace;
    if (localStorage.getItem("setting_fit_overset_frames") != "only_rich_text") {
      doFit(textFrame);
    }
  }

  // go to next line
  const newSelection = goToNextCell();
  if (!newSelection) { stopPasting() } // end of file
}


function setupButtons() {
  let panel = document.getElementById("typeset_tool");
  panel.querySelectorAll(".load_script").forEach(btn => btn.onclick = loadScript);

  stopPasting();

  characterStyleBold = undefined,
  characterStyleItalic = undefined,
  characterStyleBoldItalic = undefined;

  panel.querySelector(".control_wrapper .start").onclick = startPasting;
  panel.querySelector(".control_wrapper .stop").onclick = stopPasting;
  panel.querySelectorAll(".toggle_settings").forEach(btn => btn.onclick = toggleSettings);
  panel.querySelector(".control_wrapper_toggle").onclick = toggleControlWrapper(panel);

  if (app.documents.length > 0) {
    app.activeDocument.removeEventListener('afterSelectionChanged', selectionChanged);
    app.activeDocument.addEventListener('afterSelectionChanged', selectionChanged);
  }

  // Settings Overlay
  setupSettings();

  panel.querySelectorAll(".load_script").forEach(btn => btn.onclick = loadScript);
  panel.querySelectorAll('.settings_body .setting_persist').forEach(btn => btn.addEventListener("change", handleSettingChange));
}

function handlePressNextRow(evt) {
  if (!isPasting) return; 

  goToNextCell();
}

function handlePressPrevRow(evt) {
  if (!isPasting) return; 

  goToNextCell("prev");
}

function toggleControlWrapper(panel) {
  return function(evt) { 
    const controlWrapper = panel.querySelector(".control_wrapper");
    controlWrapper.classList.toggle("closed");
  }
}

function setupKeyboardShortcuts() {
  var nextRowMenuItem = app.scriptMenuActions.item("Manga Helper - Go to Next Row");
  if (!nextRowMenuItem.isValid) {
    nextRowMenuItem = app.scriptMenuActions.add("Manga Helper - Go to Next Row");
  }
  
  nextRowMenuItem.removeEventListener("afterInvoke", handlePressNextRow);
  nextRowMenuItem.addEventListener("afterInvoke", handlePressNextRow);


  var prevRowMenuItem = app.scriptMenuActions.item("Manga Helper - Go to Previous Row");
  if (!prevRowMenuItem.isValid) {
    prevRowMenuItem = app.scriptMenuActions.add("Manga Helper - Go to Previous Row");
  }
  
  prevRowMenuItem.removeEventListener("afterInvoke", handlePressPrevRow);
  prevRowMenuItem.addEventListener("afterInvoke", handlePressPrevRow);
}

module.exports = { 
  setupButtons,
  setupKeyboardShortcuts
}