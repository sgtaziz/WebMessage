'use strict'

import { app, protocol, BrowserWindow, ipcMain, Tray, Menu, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension from 'electron-devtools-installer'
import path from 'path'
import contextMenu from 'electron-context-menu'
import { autoUpdater } from 'electron-updater'
import Store from 'electron-store'
import localShortcut from 'electron-localshortcut'
import AutoLaunch from 'auto-launch'
import axios from 'axios'
import * as remoteMain from '@electron/remote/main'

remoteMain.initialize()
const isDevelopment = process.env.NODE_ENV !== 'production'
const persistentStore = new Store()
const autoLauncher = new AutoLaunch({
  name: 'WebMessage',
  isHidden: true,
})
const startMinimized = (process.argv || []).indexOf('--hidden') !== -1

let tray: Nullable<Tray> = null
let win: Nullable<BrowserWindow> = null
let rightClickedMessage: Nullable<object> = null
let isQuitting = false

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
    },
  },
])

contextMenu({
  prepend: () => [
    {
      label: 'Tapback',
      visible: rightClickedMessage !== null,
      click() {
        if (win) win.webContents.send('reactToMessage', rightClickedMessage)
      },
    },
  ],
})

async function loadURL() {
  if (!win) return

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools({ mode: 'undocked' })

    // Log autoUpdater in development
    // autoUpdater.logger = require('electron-log')
    // autoUpdater.logger.transports.file.level = 'info'
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 700,
    height: 600,
    minWidth: 700,
    minHeight: 600,
    transparent:
      (persistentStore.get('acceleration', true) as boolean) &&
      ((persistentStore.get('macstyle', true) as boolean) || process.platform === 'darwin'),
    frame: !(persistentStore.get('macstyle', true) || process.platform === 'darwin'),
    fullscreenable: false,
    maximizable: !(persistentStore.get('macstyle', true) || process.platform === 'darwin'),
    useContentSize: true,
    title: 'WebMessage',
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: (process.env.ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: false,
      devTools: isDevelopment && !process.env.IS_TEST,
      spellcheck: true,
    },
  })

  remoteMain.enable(win.webContents)

  if (process.platform !== 'darwin') {
    win.removeMenu()
  }

  loadURL()

  win.on('maximize', (e: Event) => {
    e.preventDefault()
  })

  win.on('close', (e: Event) => {
    if (isQuitting || !persistentStore.get('minimize', true)) {
      app.quit()
    } else if (win) {
      e.preventDefault()
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      minimizeToTray()
    }
  })

  win.webContents.on('did-fail-load', async () => {
    loadURL()
  })

  autoUpdater.on('update-available', () => {
    if (win) win.webContents.send('update_available')
  })

  autoUpdater.on('update-downloaded', () => {
    if (win) win.webContents.send('update_downloaded')
  })

  if (startMinimized) {
    win.setSkipTaskbar(true)
    win.hide()
    if (app.dock) app.dock.hide()
  }

  win.webContents.send('win_id', win.id)

  win.webContents.session.on('will-download', (event, item) => {
    event.preventDefault()
    const fs = require('fs')
    const extension = item
      .getFilename()
      .split('.')
      .pop()
    const itemURL = item.getURL()

    dialog
      .showSaveDialog({ defaultPath: item.getFilename(), filters: [{ name: extension as string, extensions: [extension as string] }] })
      .then(({ canceled, filePath }) => {
        if (canceled || !filePath) return
        const writer = fs.createWriteStream(filePath)
        const https = require('https')

        axios({
          method: 'GET',
          url: itemURL,
          responseType: 'stream',
          httpsAgent: https.Agent({ rejectUnauthorized: false }),
        }).then(({ data, headers }) => {
          if (!win) return
          const totalBytes = headers['content-length']
          let downloadedBytes = 0
          win.setProgressBar(0.01)

          data.on('data', (chunk: Buffer) => {
            if (!win) return
            downloadedBytes += Buffer.byteLength(chunk)
            win.setProgressBar(downloadedBytes / totalBytes)
          })

          data.on('end', () => {
            setTimeout(() => {
              if (!win) return
              win.setProgressBar(-1)
            }, 500)
          })

          data.pipe(writer)
        })
      })
  })
}

function showWin() {
  if (!win) createWindow()
  else {
    win.setSkipTaskbar(false)
    win.show()
    win.setAlwaysOnTop(true)
    win.setAlwaysOnTop(false) // weird work around but it works
  }
  if (app.dock) app.dock.show()

  if (win) {
    win.on('restore', () => {
      showWin()
    })
  }
}

function registerShortcuts() {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'N']

  keys.forEach(key => {
    localShortcut.register('CommandOrControl+' + key, () => {
      if (win) win.webContents.send('navigateTo', key)
    })
  })
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
    const appId = 'com.sgtaziz.WebMessage'
    app.setAppUserModelId(appId)
  }

  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension({
        id: 'ljjemllljcmogpfapbkkighbhhppjdbg', //Vue Devtools beta
        electron: '>=1.2.1',
      })
    } catch (e: any) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
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

ipcMain.on('loaded', () => {
  autoUpdater.checkForUpdatesAndNotify()
  if (win) win.webContents.send('win_id', win.id)
  registerShortcuts()
})

ipcMain.on('rightClickMessage', (event, args) => {
  rightClickedMessage = args
})

ipcMain.on('app_version', event => {
  event.sender.send('app_version', { version: app.getVersion() })
})

ipcMain.on('restart_app', () => {
  setImmediate(() => {
    isQuitting = true
    autoUpdater.quitAndInstall()
  })
})

ipcMain.on('startup_check', () => {
  autoLauncher
    .isEnabled()
    .then(function(isEnabled) {
      const optionEnabled = persistentStore.get('launchOnStartup', false)

      if (optionEnabled && !isEnabled) {
        autoLauncher.enable()
      } else if (!optionEnabled && isEnabled) {
        autoLauncher.disable()
      }
    })
    .catch(function(err) {
      console.log('Could not detect autoLauncher settings:')
      console.log(err)
    })
})

ipcMain.on('reload_app', () => {
  isQuitting = true
  app.relaunch()
  app.quit()
})

ipcMain.on('quit_app', () => {
  isQuitting = true
  app.quit()
})

function minimizeToTray() {
  if (!win) return
  win.setSkipTaskbar(true)
  win.hide()
  if (app.dock) app.dock.hide()
  loadURL()
}

ipcMain.on('minimizeToTray', () => {
  minimizeToTray()
})

ipcMain.on('show_win', () => {
  showWin()
})

function registerLocalFileProtocols() {
  protocol.registerFileProtocol('wm-audio', (request, callback) => {
    const url = request.url.replace(/^wm-audio:\/\//, '')
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url) // Needed in case URL contains spaces
    try {
      return callback(path.join(__static, decodedUrl))
    } catch (error) {
      console.error('ERROR: registerLocalAudioProtocol: Could not get file path:', error)
    }
  })

  protocol.registerFileProtocol('local-file', (request, callback) => {
    const url = request.url.replace(/^local-file:\/\//, '')
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url) // Needed in case URL contains spaces
    try {
      return callback(decodedUrl)
    } catch (error) {
      console.error('ERROR: registerLocalAudioProtocol: Could not get file path:', error)
    }
  })

  // If we are running a non-packaged version of the app && on windows
  if (isDevelopment && process.platform === 'win32') {
    // Set the path of electron.exe and your app.
    // These two additional parameters are only available on windows.
    app.removeAsDefaultProtocolClient('webmessage')
    app.setAsDefaultProtocolClient('webmessage', process.execPath, [path.resolve(process.argv[1])])
  } else {
    if (!app.isDefaultProtocolClient('webmessage')) {
      app.setAsDefaultProtocolClient('webmessage')
    }
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, args) => {
    showWin()
    const uriLocation = args.pop() as string
    const personId = uriLocation.split(':').pop()
    if (!personId || personId.trim() == '') return
    if (win) win.webContents.send('navigateChat', personId)
  })

  app.whenReady().then(() => {
    createWindow()
    registerLocalFileProtocols()

    tray = new Tray(path.join(__static, 'trayicon.png'))

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open WebMessage',
        click: () => {
          showWin()
        },
      },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])

    tray.on('double-click', () => {
      showWin()
    })

    tray.setToolTip('WebMessage')
    tray.setContextMenu(contextMenu)
  })
}
