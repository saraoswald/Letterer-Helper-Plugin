// UXP libraries have to be loaded here
const { entrypoints } = require("uxp");
const { app } = require("indesign");
const ID = require("indesign");
const fsProvider = require('uxp').storage.localFileSystem;
const formats = require('uxp').storage.formats
const fs = require('fs');

// const { domains } = require('uxp').storage;

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
