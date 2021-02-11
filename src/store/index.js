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
    playsound: persistentStore.get('playsound', true),
    startup: persistentStore.get('startup', false),
    minimize: persistentStore.get('minimize', true),
    macstyle: persistentStore.get('macstyle', true),
    acceleration: persistentStore.get('acceleration', true),
    messagesCache: [],
    enableTunnel: persistentStore.get('enableTunnel', false)
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
    setPlaySound(state, playsound) {
      state['playsound'] = playsound
      persistentStore.set('playsound', playsound)
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
    addMessages(state, messages) {
      if (!state['messagesCache'][messages.id]) state['messagesCache'][messages.id] = []
      state['messagesCache'][messages.id] = messages.data
    },
    resetMessages(state) {
      state['messagesCache'] = []
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
