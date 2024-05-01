const localStorage = window.localStorage;
// const sessionStorage = window.sessionStorage;
const util = require('./utility');

function fetchData(key) {
  let data = localStorage.getItem(currentFile); // string
  if (!data) return;

  data = JSON.parse(data); // object

  return data[key];
}

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
    util.showDialog(err.message, "An Error Occurred While Parsing the Script");
    console.log(err);
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
            thisCell.innerHTML = cell;
            thisCell.setAttribute("cell-id", cellId);
            thisCell.setAttribute("row-id", rowIndex);
            thisCell.setAttribute("column-id", cellIndex);
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

    togglePanelLoading();

  } catch(e) { console.log(e) }
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
  } catch(e) { console.log(e) }
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

  e.target.classList.remove("history-selection");

  setSelection(e.target);
}

function setSelection(cell){
  let panel = document.getElementById("typeset_tool");
  panel.querySelector(".table_body").querySelectorAll(".table_cell.selected").forEach( cell => cell.classList.remove("selected") );
    
  selection = cell;

  if (!cell) return; // skip if empty

  selection.classList.add("selected");
  selection.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

function goToCell(colId, rowId) {
  const query = `.table_cell[column-id="${colId}"][row-id="${rowId}"]`,
    newSelection = document.querySelector("#typeset_tool .table_body").querySelector(query);
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

function pasteText() {
  if (!currentScript || !selection) return;
  const doc = app.activeDocument,
    cellId = selection.getAttribute("cell-id"),
    colId = selection.getAttribute("column-id"),
    rowId = selection.getAttribute("row-id");

  let textToPlace = currentScript[cellId];
  // textToPlace = decodeURI(textToPlace); // unescape HTML (like quotes)

  doc.selection[0].contents = textToPlace;

  // go to next line
  const newRowId = parseInt(rowId) + 1;
  const newSelection = goToCell(colId, newRowId);
  if (!newSelection) { stopPasting() } // end of file
}


function setupButtons() {
  let panel = document.getElementById("typeset_tool");
  panel.querySelectorAll(".load_script").forEach(btn => btn.onclick = loadScript);

  isPasting = false;
  panel.querySelector(".control_wrapper .start").onclick = startPasting;
  panel.querySelector(".control_wrapper .stop").onclick = stopPasting;

  if (app.documents.length > 0) {
    app.activeDocument.addEventListener('afterSelectionChanged', selectionChanged);
  }
}

module.exports = { 
  setupButtons
}