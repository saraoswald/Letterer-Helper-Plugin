
## Compatibility
Since InDesign v18.5 and UXP v7.1.

## Documentation
Familiarize yourself with the following concepts to understand the plugins in more detail
- [Plugin entry-points](https://developer.adobe.com/indesign/uxp/plugins/concepts/entry-points/)
- [Plugin manifest](https://developer.adobe.com/indesign/uxp/plugins/concepts/manifest/)

## Getting started

Load plugin into the application via UXP Developer Tool (UDT)
1. Make sure your application is running and you can see it under 'Connected apps'
2. Click on 'Add Plugin' button and select the `manifest.json` of this plugin.
3. Click on the menu -> Load to view the plugin under the 'Plugins' menu inside your application.

## Development
This repo uses Node to load dependencies. To make changes in development, run:
```
npm install
npm run watch
```

This will run Webpack, updating the Javascript bundle.
