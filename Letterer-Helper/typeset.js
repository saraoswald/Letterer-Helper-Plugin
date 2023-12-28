const fsProvider = require('uxp').storage.localFileSystem;
const localStorage = window.localStorage;
const sessionStorage = window.sessionStorage;

function fetchData(key) {
  const currentFile = sessionStorage.getItem("currentFile");
  const data = sessionStorage.getItem(currentFile);

  return data[key];
}

function setData(key, value) {
  const currentFile = sessionStorage.getItem("currentFile");
  const data = sessionStorage.getItem(currentFile);

  data[key] = value;

  sessionStorage.setItem(currentFile, data);
}

function resetData(fileName) {
  sessionStorage.setItem(fileName, {}); // empty out the storage for this file
  sessionStorage.setItem("currentFile", fileName); // set it to be the current file
}

async function getText() {
  // Ask user to select a file. Show their 'Desktop' as the default folder.
  if (fsProvider.isFileSystemProvider) {
    const { domains } = require('uxp').storage;

    try {
      const file = await fsProvider.getFileForOpening({ types: [ "txt", "docx", "docx", "rtf" ] });
      if (!file) { return; } // no file selected

      resetData(file.name);

      const text = await file.read();
      
      return parseScript(text);
    } catch (err) {
      console.error(err);
    }
  }
}

let currentScript;
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
function parseScript(script) {
  currentScript = {};
  // TODO: try to guess the shape of the script + support more types
  const lines = script.split("\n");
  let parsedScript = {},
      columnsCount = 1,
      lastPanelNum = 0.0,
      lastPageNum = 0;
  
  lines.forEach( line => {
    if (line.length < 1 || line.toLowerCase().startsWith("page")) return;

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
    if(parseFloat(lineData[0]) || lineData[0] == "") lineData.shift();
    // add the line data into the panel 
    panelData.push(lineData);
    // update the max number of columns
    if (columnsCount < lineData.length) columnsCount = lineData.length;
    // update panel in the page
    pageData[panelNum] = panelData;
    // update the page in the whole script
    parsedScript[pageNum] = pageData;
  })

  return [parsedScript, columnsCount];
}

function placeText(parsedScript, columnsCount) {
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

    // fill table header
    tableHead.innerHTML = "";
    let thisHeader;
    for ( let i = 0; i < columnsCount; i++ ) {
      thisHeader = templateHead.cloneNode(true);
      thisHeader.innerHTML = i + 1;
      thisHeader.setAttribute("cell-id", `head-${i}`);
      tableHead.appendChild(thisHeader);
    }

    // fill table body
    tableBody.innerHTML = "";
    Object.entries(parsedScript).forEach( (page, pageIndex) => {
      let pageNum = page[0],
          pageData = page[1],
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
            thisLine.appendChild(thisCell);
            thisCell.onclick = changeSelection;

            // store the value in global hash
            currentScript[cellId] = cell;
          }) // forEach cell

          thisPanel.appendChild(thisLine);
        }); // forEach line

        thisPage.appendChild(thisPanel);
      }) // forEach panel

      tableBody.appendChild(thisPage);
    }) // forEach page

    overlay.style.display = "none";
    tableWrapper.style.display = "";
    controls.style.display = "";

  } catch(e) { console.log(e) }
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
      // TODO
    } else if (selection) {
      thisSelection = selection;
    } 
    else {
      // select the first cell 
      thisSelection = panel.querySelector('.table_body').querySelector(".table_cell");
    }
    setSelection(thisSelection);

    panel.querySelector(".table_wrapper").classList.add("pasting");

    selection.focus(); // todo: this doesnt work
  } catch(e) { console.log(e) }
}

function stopPasting() {
  isPasting = false;

  let panel = document.getElementById("typeset_tool");
  panel.querySelector(".control_wrapper .start").style.display = "";
  panel.querySelector(".control_wrapper .stop").style.display = "none";
  setSelection(undefined);
  
  panel.querySelector(".table_wrapper").classList.remove("pasting");
  // TODO: store last selection
}

function changeSelection(e) {
  if (!isPasting) return;

  setSelection(e.target);
}

function setSelection(cell){
  let panel = document.getElementById("typeset_tool");
  panel.querySelector(".table_body").querySelectorAll(".table_cell.selected").forEach( cell => cell.classList.remove("selected") );

  if (!cell) return; // skip if empty
    
  selection = cell;

  selection.classList.add("selected");
}

function goToCell(cellId) {
  const newSelection = document.querySelector("#typeset_tool .table_body").querySelector(`.table_cell[cell-id="${cellId}"]`)
  setSelection(newSelection);
}

// TODO: store progress for each file, and skip to the last used line on load

function loadScript() {
  const textPromise = getText();

  textPromise.then((data) => { placeText(...data)});
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
     cellId = selection.getAttribute("cell-id");

  const textToPlace = currentScript[cellId];

  doc.selection[0].contents = textToPlace;

  // go to next line

  let nextCell = cellId.split("-").map( n => parseInt(n) );
  nextCell[2] += 1; // add one to the line count;
  nextCell = nextCell.join("-"); // make it a string again

  goToCell(nextCell);
}


function setupButtons() {
  let panel = document.getElementById("typeset_tool");
  panel.querySelectorAll(".load_script").forEach(btn => btn.onclick = loadScript);

  isPasting = false;
  panel.querySelector(".control_wrapper .start").onclick = startPasting;
  panel.querySelector(".control_wrapper .stop").onclick = stopPasting;

  app.activeDocument.addEventListener('afterSelectionChanged', selectionChanged);
  
}

module.exports = { 
  setupButtons
}