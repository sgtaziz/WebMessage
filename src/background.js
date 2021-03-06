'use strict'

import { app, protocol, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
const isDevelopment = process.env.NODE_ENV !== 'production'
const path = require('path')
const contextMenu = require('electron-context-menu')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store')
const localShortcut = require('electron-localshortcut')
const AutoLaunch = require('auto-launch')

const persistentStore = new Store()
const autoLauncher = new AutoLaunch({
    name: "WebMessage",
    isHidden: true
})

let tray = null
let win = null
let startMinimized = (process.argv || []).indexOf('--hidden') !== -1;
let rightClickedMessage = null

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

contextMenu({
	prepend: (defaultActions, params, browserWindow) => [
    {
      label: "Tapback",
      visible: rightClickedMessage !== null,
      click() {
        win.webContents.send('reactToMessage', rightClickedMessage)
      }
    }
	]
})

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 700,
    minHeight: 600,
    transparent: persistentStore.get('acceleration', true) && (persistentStore.get('macstyle', true) || process.platform === 'darwin'),
    frame: !(persistentStore.get('macstyle', true) || process.platform === 'darwin'),
    fullscreenable: false,
    maximizable: !(persistentStore.get('macstyle', true) || process.platform === 'darwin'),
    useContentSize: true,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      // nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true,
      devTools: isDevelopment && !process.env.IS_TEST,
      spellcheck: true
    },
    icon: path.join(__static, 'icon.png'),
    title: 'WebMessage'
  })

  win.setResizable(true)

  if (process.platform !== 'darwin') {
    win.removeMenu()
  }

  await loadURL()

  // win.webContents.openDevTools({mode:'undocked'})

  win.on('restore', () => {
    showWin()
  })

  win.on('maximize', (e) => {
    e.preventDefault()
  })

  win.on('close', (e) => {
    if (app.isQuitting) {
      app.quit()
    } else {
      e.preventDefault()
      win.setSkipTaskbar(true)
      win.hide()
      if (app.dock) app.dock.hide()
    }
  })

  win.webContents.on('did-fail-load', async() => {
    loadURL()
  })

  autoUpdater.on('update-available', () => {
    win.webContents.send('update_available')
  })

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded')
  })

  if (startMinimized) {
    win.setSkipTaskbar(true)
    win.hide()
    if (app.dock) app.dock.hide()
  }

  win.webContents.send('win_id', win.id)

  win.webContents.session.on('will-download', (event, item, webContents) => {
    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed')
      } else if (state === 'progressing') {
        win.setProgressBar(item.getReceivedBytes()/item.getTotalBytes())
      }
    })
    item.once('done', (event, state) => {
      win.setProgressBar(-1)
    })
  })
}

async function loadURL () {
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
}

if (!persistentStore.get('acceleration', true)) {
  app.disableHardwareAcceleration()
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
  else if (win) showWin()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId("com.sgtaziz.WebMessage");
  }

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
    require('vue-devtools').install().catch((err) => {
      console.log(err)
    })
  }
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
  autoUpdater.checkForUpdatesAndNotify()
  win.webContents.send('win_id', win.id)
  registerShortcuts()
})

ipcMain.on('rightClickMessage', (event, args) => {
  rightClickedMessage = args
})

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() })
})

ipcMain.on('restart_app', () => {
  setImmediate(() => {
    app.isQuitting = true
    autoUpdater.quitAndInstall()
  })
})

ipcMain.on('startup_check', () => {
  autoLauncher.isEnabled().then(function(isEnabled) {
    let optionEnabled = persistentStore.get('startup', false)

    if (optionEnabled && !isEnabled) {
      autoLauncher.enable()
    } else if (!optionEnabled && isEnabled) {
      autoLauncher.disable()
    }
  }).catch(function (err) {
    console.log("Could not detect autoLauncher settings:")
    console.log(err)
  })
})

ipcMain.on('reload_app', () => {
  app.isQuitting = true
  app.relaunch()
  app.quit()
})

ipcMain.on('quit_app', () => {
  app.isQuitting = true
  app.quit()
})

ipcMain.on('minimizeToTray', () => {
  win.setSkipTaskbar(true)
  win.hide()
  if (app.dock) app.dock.hide()
})

ipcMain.on('show_win', () => {
  showWin()
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    showWin()
  })

  app.whenReady().then(() => {
    createWindow()
    registerLocalAudioProtocol()
    
    tray = new Tray(path.join(__static, 'trayicon.png'))

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open WebMessage', click: () => {
          showWin()
        }
      },
      {
        label: 'Quit', click: () => {
          app.isQuitting = true
          app.quit()
        }
      }
    ])

    tray.on('double-click', () => {
      showWin()
    })

    tray.setToolTip('WebMessage')
    tray.setContextMenu(contextMenu)
  })
}

function showWin () {
  if (!win) createWindow()
  else {
    win.setSkipTaskbar(false)
    win.show()
  }
  if (app.dock) app.dock.show()
}

function registerLocalAudioProtocol () {
  protocol.registerFileProtocol('wm-audio', (request, callback) => {
    const url = request.url.replace(/^wm-audio:\/\//, '')
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url) // Needed in case URL contains spaces
    try {
      return callback(path.join(__static, decodedUrl))
    } catch (error) {
      console.error(
        'ERROR: registerLocalAudioProtocol: Could not get file path:',
        error
      )
    }
  })
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const url = request.url.replace(/^local-file:\/\//, '')
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url) // Needed in case URL contains spaces
    try {
      return callback(decodedUrl)
    } catch (error) {
      console.error(
        'ERROR: registerLocalAudioProtocol: Could not get file path:',
        error
      )
    }
  })
}

function registerShortcuts () {
  [1,2,3,4,5,6,7,8,9,'N'].forEach((key) => {
    localShortcut.register('CommandOrControl+'+key, () => {
      win.webContents.send('navigateTo', key)
    })
  })
}