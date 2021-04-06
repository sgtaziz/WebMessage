import { reactive, computed, onMounted, onBeforeUnmount } from 'vue'

import { Router, useRouter } from 'vue-router'
import { Store, useStore } from 'vuex'
import { BrowserWindow, ipcRenderer, remote } from 'electron'
import { state as chatsState } from './chats'

let router: Nullable<Router> = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: Nullable<Store<any>> = null

const state = reactive({
  updateAvailable: false,
  maximized: false,
  maximizing: false,
  win: null as Nullable<BrowserWindow>,
  status: 0,
})

const statusColor = computed(() => {
  if (state.status == 0) {
    return 'rgba(255,0,0,0.8)'
  } else if (state.status == 1) {
    return 'rgba(255,100,0,0.8)'
  } else if (state.status == 2) {
    return 'rgba(0,255,0,0.5)'
  }

  return ''
})

const statusText = computed(() => {
  if (state.status == 0) {
    return 'Device not found'
  } else if (state.status == 1) {
    return 'Device found. Retrieving data...'
  } else if (state.status == 2) {
    return 'Device connected'
  }

  return ''
})

const closeWindow = () => {
  state.win?.close()
}

const minimizeWindow = () => {
  state.win?.minimize()
}

const maximizeWindow = () => {
  state.maximizing = true

  if (state.maximized) {
    state.win?.restore()
    state.win?.setSize(700, 600)
    state.win?.center()
    if (process.platform !== 'darwin') document.body.style.borderRadius = ''
  } else {
    state.win?.maximize()
    if (process.platform !== 'darwin') document.body.style.borderRadius = '0'
  }

  state.maximized = !state.maximized

  setTimeout(() => {
    state.maximizing = false
  }, 50)
}

const onMove = (e: Electron.Event) => {
  e.preventDefault()
  if (state.maximizing) return
  if (state.maximized) {
    state.win?.restore()
    if (process.platform !== 'darwin') document.body.style.borderRadius = ''
    state.maximized = false
  }
}

const restart = () => {
  ipcRenderer.send('restart_app')
}

export { state }

export default () => {
  store = useStore()
  router = useRouter()

  onBeforeUnmount(() => {
    $(window).off('resize')
    state.win?.removeListener('move', onMove)
    ipcRenderer.removeAllListeners('win_id')
  })

  const process = window.process

  onMounted(() => {
    $(document).mousedown(event => {
      if (event.which == 3) {
        //this is a right click, so electron-context-menu will be appearing momentarily...
        ipcRenderer.send('rightClickMessage', null)
      }
    })

    ipcRenderer.send('loaded')

    ipcRenderer.on('update_available', () => {
      ipcRenderer.removeAllListeners('update_available')
    })

    ipcRenderer.on('update_downloaded', () => {
      ipcRenderer.removeAllListeners('update_downloaded')
      state.updateAvailable = true
    })

    ipcRenderer.on('navigateTo', (sender, id) => {
      if (isNaN(id)) {
        router?.push('/chat/new').catch(() => {})
      } else {
        const arrayId = parseInt(id) - 1
        if (chatsState.chats[arrayId]) {
          router?.push('/chat/' + chatsState.chats[arrayId].personId).catch(() => {})
        }
      }
    })

    ipcRenderer.on('navigateChat', (sender, personId) => {
      router?.push('/chat/' + personId).catch(() => {})
    })

    ipcRenderer.on('win_id', () => {
      // state.win = remote.BrowserWindow.fromId(id)
      state.win = remote.getCurrentWindow()

      window.addEventListener('resize', () => {
        if (state.maximizing) return
        if (state.maximized) {
          state.win?.restore()
          if (process.platform !== 'darwin') document.body.style.borderRadius = ''
          state.maximized = false
        }
      })

      state.win?.on('move', onMove)

      if (!(store?.state.macstyle || process.platform === 'darwin')) {
        document.body.style.border = 'none'
        document.body.style.borderRadius = '0'
      }

      if (!store?.state.acceleration) {
        document.documentElement.style.backgroundColor = 'black'
      }
    })
  })

  return {
    state,
    statusColor,
    statusText,
    process,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restart,
  }
}
