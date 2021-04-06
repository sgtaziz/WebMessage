import { reactive, computed, ComputedRef, onMounted, getCurrentInstance, ComponentInternalInstance } from 'vue'
import main from '@/main'

import { RouteLocationNormalizedLoaded, Router, useRoute, useRouter } from 'vue-router'
import { Store, useStore } from 'vuex'
import { remote } from 'electron'
import { state as windowState } from './window'
import { state as notificationsState, sendNotifierNotification } from './notifications'

interface ChatObject {
  showNum: boolean
  address: string
  text: string
  author: string
  date: number
  personId: string
  read: boolean
}

let route: Nullable<RouteLocationNormalizedLoaded> = null
let router: Nullable<Router> = null
let currentInstance: Nullable<ComponentInternalInstance> = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: Nullable<Store<any>> = null

const state = reactive({
  chats: [] as ChatObject[],
  limit: 50,
  offset: 0,
  loading: false,
  search: '',
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filteredChats: ComputedRef<any> = computed(() => {
  let chats = state.chats.slice().sort((a, b) => (b.date - a.date > 0 ? 1 : -1))

  if (chats.length > 0) {
    chats = chats.reduce((r: ChatObject[], chat) => {
      chat.showNum = false

      const duplicateIndex = chats.findIndex(obj => obj.author == chat.author && obj.address != chat.address)
      if (duplicateIndex > -1 && !chat.address.startsWith('chat') && (chat.address.startsWith('+') || chat.address.includes('@'))) {
        chat.showNum = true
      }

      r.push(chat)
      return r
    }, [])
  }

  return chats.filter(chat => {
    return chat.author.toLowerCase().includes(state.search.toLowerCase()) || chat.text.toLowerCase().includes(state.search.toLowerCase())
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendSocket = (obj: { action: string; data: object; password?: string }) => {
  const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null
  if (!socket || !store) return

  obj.password = store.state.password
  socket.send(JSON.stringify(obj))
}

const markAsRead = (val: string) => {
  const chatIndex = state.chats.findIndex(obj => obj.personId == val)

  if (chatIndex > -1) {
    const chat = state.chats[chatIndex]

    if (!chat.read) {
      if (document.hasFocus()) {
        chat.read = true
        sendSocket({
          action: 'markAsRead',
          data: { chatId: route?.params.id },
        })
      } else {
        const onFocusHandler = () => {
          if (!chat.read && route?.path == '/chat/' + val) {
            chat.read = true
            sendSocket({
              action: 'markAsRead',
              data: { chatId: route.params.id },
            })
          }

          window.removeEventListener('focus', onFocusHandler)
        }

        window.addEventListener('focus', onFocusHandler)
      }
    }
  }
}

const cacheMessages = () => {
  if (!store?.state.cacheMessages) return
  const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null

  if (socket?.readyState == 1) {
    for (let i = 0; i < state.chats.length; i++) {
      const chat = state.chats[i]
      sendSocket({
        action: 'fetchMessages',
        data: {
          id: chat.personId,
          offset: `0`,
          limit: `25`,
        },
      })
    }
  } else {
    setTimeout(cacheMessages, 1000)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchChatsHandler = (response: any) => {
  const data = response.data
  if (state.offset == 0) state.chats = data
  else state.chats.push(...data)
  state.offset += state.limit
  state.loading = false
  cacheMessages()
  windowState.status = 2
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchMessagesHandler = (response: any) => {
  const data = response.data
  if (data && data[0] && !store?.state.messagesCache[data[0].personId]) {
    store?.commit('addMessages', { id: data[0].personId, data: data })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newMessageHandler = (response: any) => {
  const data = response.data
  const chatData = data.chat[0]

  if (chatData && chatData.personId) {
    const chatIndex = state.chats.findIndex(obj => obj.personId == chatData.personId)
    if (chatIndex > -1) state.chats.splice(chatIndex, 1)

    state.chats.unshift(chatData)
  }

  const messageData = data.message[0]

  if (messageData) {
    store?.commit('setTyping', {
      chatId: messageData.personId,
      isTyping: false,
    })

    if (store?.state.messagesCache[messageData.personId]) {
      const oldMsgIndex = store?.state.messagesCache[messageData.personId].findIndex(
        (obj: { guid: string }) => obj.guid == messageData.guid
      )
      if (oldMsgIndex != -1 && store) {
        store.state.messagesCache[messageData.personId][oldMsgIndex] = messageData
        return
      }
      store?.state.messagesCache[messageData.personId].unshift(messageData)
    }

    if (messageData.sender != 1 && remote.Notification.isSupported()) {
      if (store?.state.mutedChats.includes(messageData.personId)) return
      // if (this.lastNotificationGUID == messageData.guid) return

      let body = messageData.text.replace(/\u{fffc}/gu, '')
      if (messageData.group && messageData.group.startsWith('chat')) {
        body = `${messageData.author}: ${body}`
      }
      // this.lastNotificationGUID = messageData.guid

      const notificationOptions = {
        appID: 'com.sgtaziz.WebMessage',
        title: messageData.name as string,
        message: (body == '' ? 'Attachment' : body) as string,
        sound: store?.state.systemSound as boolean,
        reply: true,
        icon: null as Nullable<string>,
      }

      if (document.hasFocus() && remote.getCurrentWindow().isVisible() && route?.params.id == messageData.personId) return
      sendNotifierNotification(notificationOptions, messageData)
    } else if (messageData.sender != 1) {
      console.log('Notifications are not supported on this system.')
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newReactionHandler = (response: any) => {
  const data = response.data
  const reactions = data.reactions
  if (reactions && reactions.length > 0 && store?.state.messagesCache[reactions[0].personId]) {
    const msgIndex = store?.state.messagesCache[reactions[0].personId].findIndex(
      (obj: { guid: string }) => obj.guid == reactions[0].forGUID
    )
    if (msgIndex > -1 && store) {
      store.state.messagesCache[reactions[0].personId][msgIndex]['reactions'] = reactions
    }
  }

  const chatData = data.chat[0]

  if (chatData && chatData.personId) {
    const chatIndex = state.chats.findIndex(obj => obj.personId == chatData.personId)

    if (chatIndex > -1) state.chats.splice(chatIndex, 1)
    state.chats.unshift(chatData)
  }

  if (reactions && reactions.length > 0 && reactions[0].sender != 1 && remote.Notification.isSupported()) {
    const reaction = reactions[0]
    if (store?.state.mutedChats.includes(reaction.personId)) return
    // if (this.lastNotificationGUID == reaction.guid) return
    if (route?.params.id == reaction.personId && document.hasFocus()) return
    // this.lastNotificationGUID = reaction.guid

    const notificationOptions = {
      appID: 'com.sgtaziz.WebMessage',
      title: chatData.author as string,
      message: reaction.text.replace(/\u{fffc}/gu, '') as string,
      sound: store?.state.systemSound as boolean,
    }

    if (document.hasFocus()) return
    sendNotifierNotification(notificationOptions, reaction)
  } else if (reactions && reactions.length > 0 && reactions[0].sender != 1) {
    console.log('Notifications are not supported on this system.')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setAsReadHandler = (response: any) => {
  const data = response.data
  if (store?.state.messagesCache[data.chatId]) {
    const messageIndex = store.state.messagesCache[data.chatId].findIndex((obj: { guid: string }) => obj.guid == data.guid)
    if (messageIndex > -1) {
      store.state.messagesCache[data.chatId][messageIndex]['dateRead'] = data.read
      store.state.messagesCache[data.chatId][messageIndex]['dateDelivered'] = data.delivered
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setTypingIndicatorHandler = (response: any) => {
  const data = response.data
  if (data && data.chat_id) {
    const chatId = data.chat_id
    const typing = data.typing == true

    if (chatId) store?.commit('setTyping', { chatId: chatId, isTyping: typing })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeChatHandler = (response: any) => {
  const data = response.data
  if (data.chatId) {
    const chatId = data.chatId
    const chatIndex = state.chats.findIndex(obj => obj.address == chatId)

    if (chatIndex > -1) {
      const chat = state.chats[chatIndex]
      if (route?.path == '/chat/' + chat.personId) {
        router?.push('/')
      }
      if (store) store.state.messagesCache[chat.personId] = null
      state.chats.splice(chatIndex, 1)
    }
  }
}

const onSocketMessage = (event: MessageEvent) => {
  event.data.text().then((responseText: string) => {
    const response = JSON.parse(responseText)

    if (store && route && response) {
      switch (response.action) {
        case 'fetchChats':
          fetchChatsHandler(response)
          break
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
        case 'removeChat':
          removeChatHandler(response)
          break
        default:
          return
      }
    }
  })
}

const onSocketDisconnect = (e: Event | CloseEvent) => {
  const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null

  state.loading = false
  if (socket?.readyState == 1) return
  windowState.status = e instanceof CloseEvent ? 0 : 1
  state.offset = 0
  store?.commit('resetMessages')
  router?.push('/').catch(() => {})
  state.chats = []

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (windowState.status == 0) setTimeout(connectWS, 1000)
}

const onSocketConnected = () => {
  state.chats = []
  state.offset = 0
  windowState.status = 1
  state.loading = false
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  fetchChats()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchChats = () => {
  const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null

  if (socket && socket.readyState == 1) {
    if (state.loading || !route) return
    state.loading = true

    sendSocket({
      action: 'fetchChats',
      data: {
        offset: `${state.offset}`,
        limit: `${state.limit}`,
      },
    })
  } else {
    setTimeout(fetchChats, 1000)
  }
}

const deleteChat = (chat: ChatObject) => {
  const chatIndex = state.chats.findIndex(obj => obj.personId == chat.personId)
  if (chatIndex > -1) {
    state.chats.splice(chatIndex, 1)
  }

  if (route?.path == '/chat/' + chat.personId) {
    router?.push('/')
  }

  if (store) store.state.messagesCache[chat.personId] = null
}

const composeMessage = () => {
  if (windowState.status == 2) router?.push('/chat/new')
}

const connectWS = () => {
  const connect: Nullable<CallableFunction> = main ? main.config.globalProperties.$connect : null
  const disconnect: Nullable<CallableFunction> = main ? main.config.globalProperties.$disconnect : null
  if (disconnect) disconnect()

  state.offset = 0
  state.loading = false
  windowState.status = 0
  state.chats = []
  store?.commit('resetMessages')
  router?.push('/').catch(() => {})
  notificationsState.notifSound = new Audio(store?.state.notifSound)

  const baseURI = store?.getters.baseURI
  if (connect) {
    connect(baseURI, {
      format: 'json',
      reconnection: true,
    })
    const socket: Nullable<WebSocket> = main ? main.config.globalProperties.$socket : null

    socket?.removeEventListener('message', onSocketMessage)
    socket?.removeEventListener('close', onSocketDisconnect)
    socket?.removeEventListener('error', onSocketDisconnect)
    socket?.removeEventListener('open', onSocketConnected)
    socket?.addEventListener('message', onSocketMessage)
    socket?.addEventListener('close', onSocketDisconnect)
    socket?.addEventListener('error', onSocketDisconnect)
    socket?.addEventListener('open', onSocketConnected)
  } else {
    setTimeout(connectWS, 1)
  }
}

export { state }

export default () => {
  store = useStore()
  route = useRoute()
  router = useRouter()
  currentInstance = getCurrentInstance()

  const init = () => {
    state.chats = []
    state.limit = 50
    state.offset = 0
    state.loading = false
    state.search = ''
    connectWS()
  }

  init()

  const mounted = () => {
    const container = currentInstance?.refs.chats as Nullable<HTMLElement>
    if (container) {
      container.addEventListener('scroll', () => {
        if (container.scrollTop + container.offsetHeight == container.scrollHeight && !state.loading) {
          fetchChats()
        }
      })
    } else {
      setTimeout(mounted, 1)
    }
  }

  onMounted(mounted)

  return {
    state,
    filteredChats,
    fetchChats,
    deleteChat,
    composeMessage,
    markAsRead,
    connectWS,
  }
}
