import { ipcRenderer } from 'electron'
import { reactive } from 'vue'
import { Router, useRouter } from 'vue-router'
import { Store, useStore } from 'vuex'

interface NotificationOptions {
  appID: string
  title: string
  message: string
  sound: boolean
  reply?: boolean
  icon?: Nullable<string>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: Nullable<Store<any>> = null
let router: Nullable<Router> = null

const state = reactive({
  notifSound: null as Nullable<HTMLAudioElement>,
})

const sendNotifierNotification = (
  options: NotificationOptions,
  messageData: { authorDocid: string; personId: string },
  chatData: { id: string }
) => {
  const path = require('path')
  const fs = require('fs')
  const https = require('https')
  const tempDir = path.join(__dirname, '..', 'temp')

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const download = require('image-downloader')
  const fileDir = path.join(tempDir, `avatar_${messageData.authorDocid}.jpg`)
  const dlOptions = {
    url: `${store?.getters.httpURI}/contactimg?docid=${messageData.authorDocid}&auth=${encodeURIComponent(store?.state.password)}`,
    dest: fileDir,
    agent: new https.Agent({ rejectUnauthorized: false }),
  }

  download
    .image(dlOptions)
    .then(() => {
      options.icon = fileDir
      if (fs.statSync(fileDir).size == 0) throw Error('Empty image')
    })
    .catch(() => {
      options.icon = __static + '/icon.png'
    })
    .finally(() => {
      if (!store?.state.systemSound) state.notifSound?.play()

      const NotificationCenter = require('node-notifier').NotificationCenter
      let Notifier = null

      if (process.platform === 'darwin') {
        Notifier = new NotificationCenter({
          withFallback: true,
          customPath: path.join(
            __dirname,
            '../terminal-notifier/vendor/mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier'
          ),
        })
      } else {
        Notifier = require('node-notifier')
      }

      Notifier.notify(options, (err: string, action: string) => {
        if (err) return
        if ((action == 'activate' || action == undefined) && chatData && chatData.id) {
          ipcRenderer.send('show_win')
          router?.push('/chat/' + messageData.personId)
        }
      })
    })
}

export { state, sendNotifierNotification }

export default () => {
  store = useStore()
  router = useRouter()

  return { state }
}
