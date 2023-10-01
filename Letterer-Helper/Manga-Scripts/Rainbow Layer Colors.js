const getRGB = function (i, len) {
    var place = i > 0 ? i / (len - 1) : i;
    return [red(place) * 250, green(place) * 250, blue(place) * 250];
}

const curve = function (x, xOffset) {
    return -16 * Math.pow(x - xOffset, 2) + 1
}

const red = function (x) {
    if (x < 0.25) return 1;
    if (x >= 0.25 && x <= 0.5) return curve(x, 0.25);
    if (x >= 0.75) return curve(x, 1);
    return 0;
}

const green = function (x) {
    if (x <= 0.25) return curve(x, 0.25);
    if (x >= 0.25 && x <= 0.5) return 1;
    if (x >= 0.5 && x <= 0.75) return curve(x, 0.5);
    return 0;
}

const blue = function (x) {
    if (x >= 0.5 && x <= 0.75) return curve(x, 0.75);
    if (x > 0.75) return 1;
    return 0;
}

const main = function () {
    var layers = app.activeDocument.layers;
    for (var i = 0; i < layers.length; i++) {
        layers[i].layerColor = getRGB(i, layers.length);
    }
}

module.exports = { main }