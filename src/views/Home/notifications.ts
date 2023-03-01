import { ipcRenderer } from 'electron'
import { reactive } from 'vue'
import { RouteLocationNormalizedLoaded, Router, useRoute, useRouter } from 'vue-router'
import { Store, useStore } from 'vuex'
import { remote } from 'electron'
import nodeNotifier from 'node-notifier'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import https from 'https'

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

const sendPowertoastNotification = (options: NotificationOptions, messageData: { authorDocid: string; personId: string }) => {
  options.silent = !options.sound
  options.cropIcon = true
  options.onClick = 'webmessage:' + messageData.personId
  const toast = require('powertoast')
  toast(options).catch(() => {
    // console.log(err)
  })
}

const sendElectronNotification = (options: NotificationOptions, messageData: { authorDocid: string; personId: string }) => {
  const noti = new remote.Notification({
    title: options.title,
    body: options.message,
    icon: options.icon || '',
  })
  noti.show()
  noti.on('click', () => {
    console.log('clicked on message from ' + messageData.personId)
    remote.getCurrentWindow().show()
    remote.getCurrentWindow().loadURL('webmessage:' + messageData.personId)
  })
}

const downloadImage = async (url: string, imagePath: string) => {
  return new Promise((resolve, reject) => {
    axios({
      url,
      responseType: 'blob',
    })
      .then(response => {
        response.data
          .arrayBuffer()
          .then((arrBuffer: ArrayBuffer) => {
            const buffer = Buffer.from(arrBuffer)
            fs.writeFileSync(imagePath, buffer)
            resolve(imagePath)
          })
          .catch((err: string) => {
            reject(err)
          })
      })
      .catch(err => {
        reject(err)
      })
  })
}

const sendNotifierNotification = (options: NotificationOptions, messageData: { authorDocid: string; personId: string }) => {
  const tempDir = path.join(remote.app.getAppPath(), '..', 'temp')

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const fileDir = path.join(tempDir, `avatar_${messageData.authorDocid}.jpg`)
  const dlOptions = {
    url: `${store?.getters.httpURI}/contactimg?docid=${messageData.authorDocid}&auth=${encodeURIComponent(store?.state.password)}`,
    dest: fileDir,
    agent: new https.Agent({ rejectUnauthorized: false }),
  }

  downloadImage(dlOptions.url, dlOptions.dest)
    .then(dir => {
      options.icon = dir as string
      if (fs.statSync(dir as string).size == 0) throw Error('Empty image')
    })
    .catch(() => {
      options.icon = __static + '/icon.png'
    })
    .finally(() => {
      if (!store?.state.systemSound) state.notifSound?.play()
      if (document.hasFocus() && remote.getCurrentWindow().isVisible() && route?.params.id != messageData.personId) return

      const NotificationCenter = nodeNotifier.NotificationCenter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let notifier: any = nodeNotifier

      if (process.platform === 'darwin') {
        notifier = new NotificationCenter({
          withFallback: true,
          customPath: path.join(
            __dirname,
            '../terminal-notifier/vendor/mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier'
          ),
        })
      } else if (process.platform == 'win32') {
        sendPowertoastNotification(options, messageData)
        return
      } else if (process.platform == 'linux') {
        sendElectronNotification(options, messageData)
        return
      } else if (remote.Notification.isSupported()) {
        sendElectronNotification(options, messageData)
        return
      }

      notifier.notify(options, (err: string, action: string) => {
        if (err) return
        if ((action == 'activate' || action == 'click') && messageData && messageData.personId) {
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
