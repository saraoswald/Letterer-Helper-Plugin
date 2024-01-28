const path = require('path');

module.exports = {
  entry: './src/inputs.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'inputs.bundle.js'
  },
  resolve: {
    alias: {
      'node_modules': path.join(__dirname, 'node_modules'),
    },
    fallback: {
      'indesign': false,
      'uxp': false
    },
  },
  target: 'node'
};