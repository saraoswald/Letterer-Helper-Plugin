const fsProvider = require('uxp').storage.localFileSystem;

async function getText(event) {
    // Ask user to select a file. Show their 'Desktop' as the default folder.
    if (fsProvider.isFileSystemProvider) {
      const { domains } = require('uxp').storage;
  
      try {
        const file = await fsProvider.getFileForOpening({ initialDomain: domains.userDesktop, types: [ "txt" ] });
        if (!file) { return; } // no file selected

        return await file.read();
      } catch (err) {
        console.error(err);
      }
    }
  }

function loadScript() {
    const textPromise = getText();

    textPromise.then(text => console.log(text));
}

module.exports = { 
    loadScript
}