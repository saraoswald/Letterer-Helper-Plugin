const fsProvider = require('uxp').storage.localFileSystem;

async function getText() {
  // Ask user to select a file. Show their 'Desktop' as the default folder.
  if (fsProvider.isFileSystemProvider) {
    const { domains } = require('uxp').storage;

    try {
      const file = await fsProvider.getFileForOpening({ types: [ "txt", "docx", "docx", "rtf" ] });
      if (!file) { return; } // no file selected

      const text = await file.read();
      
      return parseScript(text);
    } catch (err) {
      console.error(err);
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
function parseScript(script) {
  // TODO: try to guess the shape of the script + support more types
  const lines = script.split("\n");
  let parsedScript = {},
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
    // update panel in the page
    pageData[panelNum] = panelData;
    // update the page in the whole script
    parsedScript[pageNum] = pageData;
  })

  return parsedScript;
}

function placeText(parsedScript) {
  if (!parsedScript) return; 

  console.log(parsedScript);
  
  try {
    // DOM elements
    const panel = document.getElementById("typeset_tool"),
      overlay = panel.querySelector('.overlay'),
      controls = panel.querySelector('.control_wrapper'),
      tableWrapper = panel.querySelector(".table_wrapper"),
      tableBody = tableWrapper.querySelector(".table_body");
    // templates
    const templatePage = panel.querySelector("#template_page div").cloneNode(true), // true == deep clone
      templatePanel = templatePage.querySelector('.table_page_panel').cloneNode(true),
      templateLine = templatePanel.querySelector(".table_row").cloneNode(true),
      templateCell = templateLine.querySelector(".table_cell").cloneNode(true);

    // fill table head TODO
    // Object.entries(parsedScript).find((page) => )

    tableBody.innerHTML = "";

    // fill table body
    Object.entries(parsedScript).forEach((page, index) => {
      let pageNum = page[0],
          pageData = page[1],
          thisPage = templatePage.cloneNode(true);

      thisPage.removeChild(thisPage.querySelector(".table_page_panel"));
      thisPage.querySelector(".page_num").innerHTML = pageNum;

      Object.entries(pageData).forEach((panel, index) => {
        let panelData = panel[1],
            panelNum = panel[0],
            thisPanel = templatePanel.cloneNode(true);
        thisPanel.querySelector(".panel_num").innerHTML = panelNum;

        panelData.forEach( line => {
          let thisLine = templateLine.cloneNode(true);
              thisLine.innerHTML = "";
          
          line.forEach( (cell) => {
            let thisCell = templateCell.cloneNode(true);
            thisCell.innerHTML = cell;
            thisLine.appendChild(thisCell);
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


// TODO: store progress for each file, and skip to the last used line on load

function loadScript() {
  const textPromise = getText();

  textPromise.then(parsedScript => placeText(parsedScript));
}

module.exports = { 
  loadScript
}