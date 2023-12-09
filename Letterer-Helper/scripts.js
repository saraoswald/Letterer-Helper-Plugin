const ID = require("indesign");

const setRainbowLayers = require('./Manga-Scripts/Rainbow Layer Colors.js');
const skewFrame = require('./Manga-Scripts/Skew Frame.js');
const adjustSizeAndLeading = require('./Manga-Scripts/Adjust Size and Leading.js');

const refitOversetFrames = require('./Manga-Scripts/Refit Overset Frames.js'),
  scalePages = require('./Manga-Scripts/Scale Pages.js'),
  positionArt = require('./Manga-Scripts/position.js'),
  mangaEmDash = require('./Manga-Scripts/Manga Em Dash.js'),
  pseudoStroke = require('./Manga-Scripts/Pseudo-Stroke.js'),
  typeset = require('./typeset.js');

module.exports = {
  setRainbowLayers: setRainbowLayers.main,
  skewFrame,
  adjustSizeAndLeading,
  refitOversetFrames: refitOversetFrames.main,
  scalePages: scalePages.main,
  positionArt: positionArt.main,
  mangaEmDash: mangaEmDash.main,
  pseudoStroke: pseudoStroke.main,
  typeset
}