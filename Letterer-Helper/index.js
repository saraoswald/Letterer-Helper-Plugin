const { entrypoints } = require("uxp");
const { app } = require("indesign");

entrypoints.setup({
  panels: {
    mainPanel: {
      show(body) {
        let content = document.getElementById('main_panel');
        content.style.display = "";
        body.appendChild(content);
      }
    },
    typesetTool: {
      show(body) { 
        let content = document.getElementById('typeset_tool');
        content.style.display = "";
        body.appendChild(content);
      }
    }
  }
});
