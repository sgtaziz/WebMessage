import { createStore } from 'vuex'
import Store from 'electron-store'
import axios from 'axios'
import { ipcRenderer } from 'electron'

const persistentStore = new Store()

export default createStore({
  state: {
    password: persistentStore.get('password', '') as string,
    ipAddress: persistentStore.get('ipAddress', '') as string,
    fallbackIpAddress: persistentStore.get('fallbackIpAddress', '') as string,
    port: persistentStore.get('port', 8180) as number,
    ssl: persistentStore.get('ssl', true) as boolean,
    subjectLine: persistentStore.get('subjectLine', false) as boolean,
    transcode: persistentStore.get('transcode', true) as boolean,
    systemSound: persistentStore.get('systemSound', false) as boolean,
    launchOnStartup: persistentStore.get('launchOnStartup', false) as boolean,
    minimize: persistentStore.get('minimize', true) as boolean,
    macstyle: persistentStore.get('macstyle', true) as boolean,
    acceleration: persistentStore.get('acceleration', true) as boolean,
    messagesCache: [] as object[],
    enableTunnel: persistentStore.get('enableTunnel', false) as boolean,
    cacheMessages: persistentStore.get('cacheMessages', false) as boolean,
    mutedChats: persistentStore.get('mutedChats', []) as string[],
    notifSound: persistentStore.get('notifSound', 'wm-audio://receivedText.mp3') as string,
    emojiSet: persistentStore.get('emojiSet', 'Twitter') as string,
    isTyping: [] as boolean[],
    isTypingTimer: [] as NodeJS.Timeout[],
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
    setTranscode(state, transcode) {
      state['transcode'] = transcode
      persistentStore.set('transcode', transcode)
    },
    setSystemSound(state, systemSound) {
      state['systemSound'] = systemSound
      persistentStore.set('systemSound', systemSound)
    },
    setStartup(state, launchOnStartup) {
      state['launchOnStartup'] = launchOnStartup
      persistentStore.set('launchOnStartup', launchOnStartup)
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
    setEmojiSet(state, emojiSet) {
      state['emojiSet'] = emojiSet
      persistentStore.set('emojiSet', emojiSet)
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
      state['isTyping'][data.chatId] = data.isTyping

      if (!data.isTyping) return
      if (state['isTypingTimer'][data.chatId]) clearTimeout(state['isTypingTimer'][data.chatId])

      state['isTypingTimer'][data.chatId] = setTimeout(() => {
        state['isTyping'][data.chatId] = false
      }, 60000)
    },
  },
  getters: {
    baseURI: state => {
      const scheme = state['ssl'] ? 'wss' : 'ws'
      return scheme + '://' + state['ipAddress'] + ':' + state['port'] + '?auth=' + state['password']
    },
    httpURI: state => {
      const scheme = state['ssl'] ? 'https' : 'http'
      return scheme + '://' + state['ipAddress'] + ':' + state['port']
    },
  },
  actions: {},
  modules: {},
})
