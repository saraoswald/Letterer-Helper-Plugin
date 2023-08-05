const setRainbowLayers = require('./Manga-Scripts/Rainbow Layer Colors.js');
const adjustSizeAndLeading = require('./Manga-Scripts/Adjust Size and Leading.js');
const refitOversetFrames = require('./Manga-Scripts/Refit Overset Frames.js');

module.exports = {
  setRainbowLayers: setRainbowLayers.main,
  adjustSizeAndLeading,
  refitOversetFrames: refitOversetFrames.main
}