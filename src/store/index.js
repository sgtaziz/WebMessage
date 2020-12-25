import Vue from 'vue'
import Vuex from 'vuex'
const Store = require('electron-store')

Vue.use(Vuex)

const persistentStore = new Store()

export default new Vuex.Store({
  state: {
    password: persistentStore.get('password') || "",
    ipAddress: persistentStore.get('ipAddress') || "",
    port: persistentStore.get('port') || 8180,
    ssl: persistentStore.get('ssl') || true
  },
  mutations: {
    setPassword(state, password) {
      state['password'] = password
      persistentStore.set('password', password)
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
