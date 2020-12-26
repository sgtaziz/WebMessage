module.exports = {
  configureWebpack: {
    target: "electron-renderer"
  },
  pluginOptions: {
    electronBuilder: {
      appId: "com.sgtaziz.WebMessage",
      productName: "WebMessage",
      outputDir: 'build',
      preload: 'src/preload.js',
      builderOptions: {
        appId: "com.sgtaziz.WebMessage",
        productName: "WebMessage",
        publish: ['github'],
        snap: {
          publish: ['github']
        }
      }
    }
  }
}
