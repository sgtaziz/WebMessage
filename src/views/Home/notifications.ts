import { ipcRenderer } from 'electron'
import { reactive } from 'vue'
import { RouteLocationNormalizedLoaded, Router, useRoute, useRouter } from 'vue-router'
import { Store, useStore } from 'vuex'
import { remote } from 'electron'
import toast from 'powertoast'

interface NotificationOptions {
  appID: string
  title: string
  message: string
  sound: boolean
  reply?: boolean
  icon?: Nullable<string>
  actions?: string[]
  cropIcon?: boolean
  silent?: boolean
  onClick?: string
}

let route: Nullable<RouteLocationNormalizedLoaded> = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: Nullable<Store<any>> = null
let router: Nullable<Router> = null

const state = reactive({
  notifSound: null as Nullable<HTMLAudioElement>,
})

const sendPowertoastNotification = (
  options: NotificationOptions,
  messageData: { authorDocid: string; personId: string },
  chatData: { id: string }
) => {
  options.silent = !options.sound
  options.cropIcon = true
  options.onClick = 'webmessage:' + messageData.personId
  toast(options).catch((err: string) => {
    console.log(err)
  })
}

const sendNotifierNotification = (
  options: NotificationOptions,
  messageData: { authorDocid: string; personId: string },
  chatData: { id: string }
) => {
  const path = require('path')
  const fs = require('fs')
  const https = require('https')
  const tempDir = path.join(remote.app.getAppPath(), '..', 'temp')

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

  console.log('trying to download', dlOptions)

  download
    .image(dlOptions)
    .then(() => {
      options.icon = fileDir
      if (fs.statSync(fileDir).size == 0) throw Error('Empty image')
    })
    .catch((err: any) => {
      console.log(err)
      options.icon = __static + '/icon.png'
    })
    .finally(() => {
      console.log('done downloading')
      if (!store?.state.systemSound) state.notifSound?.play()
      if (document.hasFocus() && remote.getCurrentWindow().isVisible() && route?.params.id != messageData.personId) return

      const NotificationCenter = require('node-notifier').NotificationCenter
      let notifier: any = null

      if (process.platform === 'darwin') {
        notifier = new NotificationCenter({
          withFallback: true,
          customPath: path.join(
            __dirname,
            '../terminal-notifier/vendor/mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier'
          ),
        })
      } else if (process.platform == 'win32') {
        sendPowertoastNotification(options, messageData, chatData)
        return
      } else {
        notifier = require('node-notifier')
      }

      notifier.notify(options, (err: any, action: any) => {
        if (err) return
        if ((action == 'activate' || action == 'click') && chatData && chatData.id) {
          ipcRenderer.send('show_win')
          router?.push('/chat/' + messageData.personId)
        }
      })
    })
}

export { state, sendNotifierNotification }

export default () => {
  store = useStore()
  route = useRoute()
  router = useRouter()

  return { state }
}
