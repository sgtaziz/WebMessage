import { reactive, computed, ComputedRef, watch, ComponentInternalInstance, getCurrentInstance, nextTick } from 'vue'
import main from '@/main'
import { postLoad, scrollToBottom, hookPasteAndDrop, state as functionsState } from './functions'

import { parseBuffer } from 'bplist-parser'
import moment from 'moment'
import { RouteLocationNormalizedLoaded, Router, useRoute, useRouter } from 'vue-router'
import { Store, useStore } from 'vuex'

interface ReloadGUIDObject {
  [key: string]: Nullable<boolean>
}

let route: Nullable<RouteLocationNormalizedLoaded> = null
let router: Nullable<Router> = null
let currentInstance: Nullable<ComponentInternalInstance> = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: Nullable<Store<any>> = null

const state = reactive({
  messages: [] as { chatId: string; guid: string; reactions: object; date: number; dateRead: number; dateDelivered: number }[],
  limit: 25,
  offset: 0,
  receiver: '',
  loading: false,
  reloadingGuid: {} as ReloadGUIDObject,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortedMessages: ComputedRef<any> = computed(() => {
  const messages = state.messages.slice(0).sort((a, b) => (b.date - a.date > 0 ? 1 : -1))

  let lastSentMessageFound = false
  let lastReadMessageFound = false

  const groupDates = (date1: number, date2: number) => date2 - date1 < 3600000
  const groupAuthor = (author1: string, author2: string) => author1 == author2

  const groupedMessages = messages.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any, { text, subject, dateRead, dateDelivered, guid, reactions, payload, attachments, balloonBundle, ...rest }: any, i, arr) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev: any = arr[i + -1]
      const extras: { payload?: object; undisplayable?: boolean } = {}

      if (payload) {
        try {
          const data = Buffer.from(payload, 'base64')
          const payloadBuffer = parseBuffer(data)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsedData: any = {}
          let lastClassname = 'root'

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payloadBuffer[0].$objects.forEach((object: any) => {
            if (object.$classname) lastClassname = object.$classname
            if (typeof object != 'string' || object == 'website' || object == '$null' || object.startsWith('image/')) return
            if (lastClassname == 'NSUUID') throw Error('MSMessage payload')
            if (!parsedData[lastClassname]) parsedData[lastClassname] = []

            parsedData[lastClassname].push(object)
          })

          extras.payload = parsedData
        } catch (error) {
          extras.undisplayable = true
        }

        if (Date.now() - rest.date >= 15000 && Object.keys(extras.payload ?? {}).length <= 1) {
          delete extras.payload
          payload = null
          balloonBundle = null
        }

        const supportedFormats = ['', 'com.apple.messages.URLBalloonProvider']
        if (!extras.undisplayable && balloonBundle && !supportedFormats.includes(balloonBundle)) {
          extras.undisplayable = true
          attachments = []
        }
      }

      if (prev && groupAuthor(rest.author, prev.author) && groupAuthor(rest.sender, prev.sender) && groupDates(rest.date, prev.date)) {
        r[r.length - 1].texts.unshift({
          text: text,
          subject: subject,
          date: rest.date,
          attachments: attachments,
          read: dateRead,
          delivered: dateDelivered,
          guid: guid,
          reactions: reactions,
          showStamp: rest.sender == 1 && (!lastSentMessageFound || (!lastReadMessageFound && dateRead > 0)),
          balloon: balloonBundle != null,
          ...extras,
        })
      } else {
        r.push({
          ...rest,
          texts: [
            {
              text: text,
              subject: subject,
              date: rest.date,
              attachments: attachments,
              read: dateRead,
              delivered: dateDelivered,
              guid: guid,
              reactions: reactions,
              showStamp: rest.sender == 1 && (!lastSentMessageFound || (!lastReadMessageFound && dateRead > 0)),
              balloon: balloonBundle != null,
              ...extras,
            },
          ],
        })
      }

      if (rest.sender == 1 && !lastSentMessageFound) lastSentMessageFound = true
      if (rest.sender == 1 && !lastReadMessageFound && dateRead > 0) lastReadMessageFound = true

      return r
    },
    []
  )

  return groupedMessages.reverse()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendSocket = (obj: { action: string; data: object; password?: string }) => {
  const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null
  if (!socket || !store) return

  obj.password = store.state.password
  socket.send(JSON.stringify(obj))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchMessagesHandler = (response: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Array<any> = response.data
  if (data && route && data[0] && data[0].personId != route.params.id) return

  if (state.offset == 0) {
    state.messages = data
    postLoad(true)
    // this.hookPasteAndDrop()
  } else {
    state.messages.push(...data)
    postLoad(false)
  }

  // state.loading = false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newMessageHandler = (response: any) => {
  if (!route || !router || !store) return
  const message = response.data.message

  if (route.params.id == 'new') {
    if (Object.keys(message).length > 0) {
      if (message[0].chatId == state.receiver) {
        router.push('/message/' + message[0].personId)
      }
    }
    return
  }

  if (Object.keys(message).length == 0) {
    console.log('Received a message, but content was empty.')
  } else {
    if (state.messages && state.messages.length > 0 && message[0]['personId'] == route.params.id) {
      state.reloadingGuid[message[0].guid] = null
      const oldMsgIndex = state.messages.findIndex(obj => obj.guid == message[0].guid)
      if (oldMsgIndex != -1) {
        state.messages[oldMsgIndex] = message[0]
        return
      }

      if (message[0].sender != 1) {
        store.commit('setTyping', {
          chatId: route.params.id,
          isTyping: false,
        })
      }

      state.messages.unshift(message[0])

      if (functionsState.lastHeight == null) {
        functionsState.ignoreNextScroll = true
        nextTick(scrollToBottom)
      }

      if (functionsState.lastHeight == null) {
        currentInstance?.emit('markAsRead', route.params.id)
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newReactionHandler = (response: any) => {
  const reactions = response.data.reactions
  if (reactions && reactions.length > 0) {
    const msgIndex = state.messages.findIndex(obj => obj.guid == reactions[0].forGUID)
    if (msgIndex > -1) {
      state.messages[msgIndex].reactions = reactions

      let intervalTime = 0
      nextTick(() => {
        if (functionsState.lastHeight == null) {
          const interval = setInterval(() => {
            if (functionsState.lastHeight == null) scrollToBottom()
            if (intervalTime >= 200) clearInterval(interval)
            intervalTime += 1
          }, 1)
        }
      })
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setAsReadHandler = (response: any) => {
  const data = response.data
  if (route?.params.id == 'new' || !data) return
  if (route?.params.id == data.chatId) {
    const messageIndex = state.messages.findIndex(obj => obj.guid == data.guid)
    if (messageIndex > -1) {
      state.messages[messageIndex]['dateRead'] = data.read
      state.messages[messageIndex]['dateDelivered'] = data.delivered

      if (functionsState.lastHeight == null) {
        functionsState.ignoreNextScroll = true
        nextTick(scrollToBottom)
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setTypingIndicatorHandler = (response: any) => {
  const data = response.data
  if (data && data.chat_id == route?.params.id && functionsState.lastHeight == null) {
    functionsState.ignoreNextScroll = true
    nextTick(scrollToBottom)
  }
}

const onSocketMessage = (event: MessageEvent) => {
  event.data.text().then((responseText: string) => {
    const response = JSON.parse(responseText)

    if (store && route && response) {
      switch (response.action) {
        case 'fetchMessages':
          fetchMessagesHandler(response)
          break
        case 'newMessage':
          newMessageHandler(response)
          break
        case 'newReaction':
          newReactionHandler(response)
          break
        case 'setAsRead':
          setAsReadHandler(response)
          break
        case 'setTypingIndicator':
          setTypingIndicatorHandler(response)
          break
        default:
          return
      }
    }
  })
}

const onSocketDisconnect = () => {
  state.messages = []
  state.limit = 25
  state.offset = 0
  state.receiver = ''
  state.loading = false
}

const onSocketConnected = () => {
  state.messages = []
  state.limit = 25
  state.offset = 0
  state.receiver = ''
  state.loading = false
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  fetchMessages()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchMessages = () => {
  const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null
  if (route && state.offset == 0 && store && store.state.messagesCache[route.params.id as string]) {
    state.messages = store.state.messagesCache[route.params.id as string].map((o: object) => ({ ...o }))
    postLoad(true)
    hookPasteAndDrop()
    return
  }

  if (socket && socket.readyState == 1) {
    if (state.loading || !route) return
    state.loading = true

    sendSocket({
      action: 'fetchMessages',
      data: {
        id: route.params.id,
        offset: `${state.offset}`,
        limit: `${state.limit}`,
      },
    })

    socket.removeEventListener('message', onSocketMessage)
    socket.removeEventListener('close', onSocketDisconnect)
    socket.removeEventListener('error', onSocketDisconnect)
    socket.removeEventListener('open', onSocketConnected)
    socket.addEventListener('message', onSocketMessage)
    socket.addEventListener('close', onSocketDisconnect)
    socket.addEventListener('error', onSocketDisconnect)
    socket.addEventListener('open', onSocketConnected)
  } else {
    setTimeout(fetchMessages, 1000)
  }
}

const reloadMessage = (guid: string) => {
  if (state.reloadingGuid[guid]) return

  state.reloadingGuid[guid] = true
  sendSocket({
    action: 'getMessageByGUID',
    data: {
      guid: guid,
    },
  })
}

const humanReadableDay = (date: number) => {
  const ts = date
  const today = new Date()
  const tsDate = new Date(ts).setHours(0, 0, 0, 0)

  if (new Date().setHours(0, 0, 0, 0) == tsDate) {
    return 'Today'
  } else if (tsDate >= new Date().setHours(0, 0, 0, 0) - 86400000) {
    return 'Yesterday'
  } else {
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).setHours(0, 0, 0, 0)
    if (ts >= lastWeek) {
      return moment(ts).format('dddd')
    }
  }

  const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).setHours(0, 0, 0, 0)
  if (ts < lastYear) {
    return moment(ts).format('ll') + ','
  }

  return moment(ts).format('ddd, MMM D') + ','
}

const dateGroup = (prev: number, current: number) => {
  const prevstamp = sortedMessages.value[prev] ? sortedMessages.value[prev].texts[0].date : 0
  const currstamp = sortedMessages.value[current].texts[0].date

  if (prev == -1 || currstamp - prevstamp > 3600000) {
    const humanReadableStamp = humanReadableDay(currstamp)
    return `<span class="bold">${humanReadableStamp}</span> ${moment(currstamp).format('LT')}`
  } else {
    return ''
  }
}

const humanReadableTimestamp = (date: number) => {
  const ts = date
  const tsDate = new Date(ts).setHours(0, 0, 0, 0)

  if (new Date().setHours(0, 0, 0, 0) == tsDate) {
    return moment(ts).format('LT')
  } else if (tsDate >= new Date().setHours(0, 0, 0, 0) - 86400000) {
    return 'Yesterday'
  } else {
    const today = new Date()
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).setHours(0, 0, 0, 0)
    if (ts >= lastWeek) {
      return moment(ts).format('dddd')
    }
  }

  return moment(ts).format('M/D/YY')
}

export { state, fetchMessages, sendSocket }

export default () => {
  store = useStore()
  route = useRoute()
  router = useRouter()
  currentInstance = getCurrentInstance()

  const init = () => {
    state.messages = []
    state.limit = 25
    state.offset = 0
    state.receiver = ''
    state.loading = false
    state.reloadingGuid = {}
    fetchMessages()
  }

  init()
  watch(() => route?.params.id, init)

  return {
    state,
    sortedMessages,
    fetchMessages,
    dateGroup,
    humanReadableTimestamp,
    reloadMessage,
  }
}
