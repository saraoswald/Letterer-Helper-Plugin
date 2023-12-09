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
  
  const panel = document.getElementById("typeset_tool"),
    overlay = panel.querySelector('.overlay'),
    tableWrapper = panel.querySelector(".table_wrapper"),
    tableBody = tableWrapper.querySelector(".table_body"),
    template = tableBody.querySelector("template div").cloneNode(true);

  Object.entries(parsedScript).forEach((page, pageNum) => {
    let pageData = page[1],
        templatePage = template.cloneNode(true); // true == deep clone
    templatePage.setAttribute("page-num", pageNum);

    Object.entries(pageData).forEach((panel, panelNum) => {
      let panelData = panel[1],
          templatePanel = templatePage.querySelector('.table_page_panel');
      templatePanel.setAttribute("panel-num", panelNum);

      panelData.forEach( line => {
        let templateLine = templatePanel.querySelector(".table_row").cloneNode(true),
            templateCell = templateLine.querySelector(".table_cell").cloneNode(true);
        templateLine.innerHTML = "";
        
        line.forEach( (cell) => {
          let thisCell = templateCell.cloneNode(true);
          thisCell.innerHTML = cell;
          templateLine.appendChild(thisCell);
        }) // forEach cell

        templatePanel.appendChild(templateLine);
      }); // forEach line

      templatePage.appendChild(templatePanel);
    }) // forEach panel

    tableBody.appendChild(templatePage);
  }) // forEach page

  overlay.style.display = "none";
  tableWrapper.style.display = "";
}


// TODO: store progress for each file, and skip to the last used line on load

function loadScript() {
  const textPromise = getText();

  textPromise.then(parsedScript => placeText(parsedScript));
}

module.exports = { 
  loadScript
}