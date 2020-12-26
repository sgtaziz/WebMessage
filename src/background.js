'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
const isDevelopment = process.env.NODE_ENV !== 'production'
const path = require('path')
const contextMenu = require('electron-context-menu');
const { autoUpdater } = require('electron-updater');

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

contextMenu({
	prepend: (defaultActions, params, browserWindow) => [
	]
});

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 700,
    minHeight: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      // nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true
    },
    icon: path.join(__static, 'icon.png')
  })

  win.minimizedState = true;

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools({mode:'undocked'})

    //Log autoUpdater in development
    autoUpdater.logger = require("electron-log")
    autoUpdater.logger.transports.file.level = "info"
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }


  autoUpdater.on('update-available', () => {
    win.webContents.send('update_available')
  })

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded')
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    // A directory named 'vender' in the project root
    // is required for this to work. The correct file
    // can be found within the vue-devtools project.
    require('vue-devtools').install()
  }

  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

app.commandLine.appendSwitch('ignore-certificate-errors', 'true')

ipcMain.on('loaded', (event) => {
  console.log('Running auto updater...')
  autoUpdater.checkForUpdatesAndNotify()
})

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() })
})

ipcMain.on('restart_app', () => {
  setImmediate(() => {
    autoUpdater.quitAndInstall()
  })
})
