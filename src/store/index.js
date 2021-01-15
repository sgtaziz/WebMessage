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
    port: persistentStore.get('port', 8180),
    ssl: persistentStore.get('ssl', true),
    startup: persistentStore.get('startup', false),
    minimize: persistentStore.get('minimize', true),
    macstyle: persistentStore.get('macstyle', true),
    acceleration: persistentStore.get('acceleration', true)
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
    setPort(state, port) {
      state['port'] = port
      persistentStore.set('port', port)
    },
    setSSL(state, ssl) {
      state['ssl'] = ssl
      persistentStore.set('ssl', ssl)
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
