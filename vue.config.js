module.exports = {
  productionSourceMap: true,
  configureWebpack: {
    target: 'electron-renderer',
    node: {
      __filename: true,
      __dirname: true,
    },
    resolve: {
      alias: {
        vue$: 'vue/dist/vue.esm-bundler',
      },
    },
  },
  pluginOptions: {
    electronBuilder: {
      appId: 'com.sgtaziz.WebMessage',
      productName: 'WebMessage',
      outputDir: 'build',
      nodeIntegration: true,
      // preload: 'src/preload.js',
      builderOptions: {
        appId: 'com.sgtaziz.WebMessage',
        protocols: [
          {
            name: 'WebMessage',
            role: 'Viewer',
            schemes: ['webmessage'],
          },
        ],
        productName: 'WebMessage',
        publish: ['github'],
        snap: {
          publish: ['github'],
        },
        win: {
          icon: 'build/icons/icon.ico',
        },
        mac: {
          icon: 'build/icons/icon.icns',
        },
        extraFiles: [
          {
            from: 'node_modules/node-notifier/vendor/',
            to: 'resources/vendor',
          },
          {
            from: 'terminal-notifier/',
            to: 'resources/terminal-notifier',
          },
        ],
      },
    },
  },
}
