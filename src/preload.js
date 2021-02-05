const { remote, ipcRenderer, Notification, shell } = require('electron')
window.ipcRenderer = ipcRenderer
window.remote = remote
window.__dirname = __dirname
window.shell = shell