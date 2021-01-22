const { remote, ipcRenderer, Notification } = require('electron')
window.ipcRenderer = ipcRenderer
window.remote = remote
window.__dirname = __dirname