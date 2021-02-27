import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

const Store = require('electron-store')

Vue.use(Vuex)

const persistentStore = new Store()

export default new Vuex.Store({
  state: {
    password: persistentStore.get('password', ''),
    ipAddress: persistentStore.get('ipAddress', ''),
    fallbackIpAddress: persistentStore.get('fallbackIpAddress', ''),
    port: persistentStore.get('port', 8180),
    ssl: persistentStore.get('ssl', true),
    subjectLine: persistentStore.get('subjectLine', false),
    systemSound: persistentStore.get('systemSound', false),
    startup: persistentStore.get('startup', false),
    minimize: persistentStore.get('minimize', true),
    macstyle: persistentStore.get('macstyle', true),
    acceleration: persistentStore.get('acceleration', true),
    messagesCache: [],
    enableTunnel: persistentStore.get('enableTunnel', false),
    cacheMessages: persistentStore.get('cacheMessages', false),
    mutedChats: persistentStore.get('mutedChats', []),
    notifSound: persistentStore.get('notifSound', 'wm-audio://receivedText.mp3'),
    isTyping: {},
    isTypingTimer: {}
  },
  mutations: {
    setPassword(state, password) {
      state['password'] = password
      persistentStore.set('password', password)
      axios.defaults.headers.common['Authorization'] = password
    },
    setIPAddress(state, ip) {
      state['ipAddress'] = ip
      persistentStore.set('ipAddress', ip)
    },
    setFallbackIPAddress(state, ip) {
      state['fallbackIpAddress'] = ip
      persistentStore.set('fallbackIpAddress', ip)
    },
    setPort(state, port) {
      state['port'] = port
      persistentStore.set('port', port)
    },
    setSSL(state, ssl) {
      state['ssl'] = ssl
      persistentStore.set('ssl', ssl)
    },
    setSubjectLine(state, subjectLine) {
      state['subjectLine'] = subjectLine
      persistentStore.set('subjectLine', subjectLine)
    },
    setSystemSound(state, systemSound) {
      state['systemSound'] = systemSound
      persistentStore.set('systemSound', systemSound)
    },
    setStartup(state, startup) {
      state['startup'] = startup
      persistentStore.set('startup', startup)
      ipcRenderer.send('startup_check')
    },
    setMinimize(state, minimize) {
      state['minimize'] = minimize
      persistentStore.set('minimize', minimize)
    },
    setMacStyle(state, macstyle) {
      state['macstyle'] = macstyle
      persistentStore.set('macstyle', macstyle)
    },
    setAcceleration(state, acceleration) {
      state['acceleration'] = acceleration
      persistentStore.set('acceleration', acceleration)
    },
    setTunnel(state, enableTunnel) {
      state['enableTunnel'] = enableTunnel
      persistentStore.set('enableTunnel', enableTunnel)
    },
    setNotifSound(state, notifSound) {
      state['notifSound'] = notifSound
      persistentStore.set('notifSound', notifSound)
    },
    setCacheMessages(state, cacheMessages) {
      state['cacheMessages'] = cacheMessages
      persistentStore.set('cacheMessages', cacheMessages)
    },
    addMessages(state, messages) {
      if (!state['messagesCache'][messages.id]) state['messagesCache'][messages.id] = []
      state['messagesCache'][messages.id] = messages.data
    },
    muteChat(state, chatId) {
      if (state.mutedChats.includes(chatId)) return
      state.mutedChats.push(chatId)
      persistentStore.set('mutedChats', state.mutedChats)
    },
    unmuteChat(state, chatId) {
      if (!state.mutedChats.includes(chatId)) return
      const index = state.mutedChats.indexOf(chatId)
      if (index > -1) {
        state.mutedChats.splice(index, 1)
      }
      persistentStore.set('mutedChats', state.mutedChats)
    },
    resetMessages(state) {
      state['messagesCache'] = []
    },
    setTyping(state, data) {
      Vue.set(state['isTyping'], data.chatId, data.isTyping)

      if (state['isTypingTimer'][data.chatId]) clearTimeout(state['isTypingTimer'][data.chatId])

      state['isTypingTimer'][data.chatId] = setTimeout(() => {
        Vue.set(state['isTyping'], data.chatId, false)
      }, 60000)
    }
  },
  getters: {
    baseURI: state => {
      var scheme = state['ssl'] ? "wss" : "ws"
      return scheme + "://" + state['ipAddress'] + ":" + state['port'] + "?auth=" + encodeURIComponent(state['password'])
    },
    httpURI: state => {
      var scheme = state['ssl'] ? "https" : "http"
      return scheme + "://" + state['ipAddress'] + ":" + state["port"]
    }
  },
  actions: {
  },
  modules: {
  }
})
