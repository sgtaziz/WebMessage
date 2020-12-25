import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import filters from './filters'
import mixins from './mixin'
import axios from 'axios'
import VueNativeSock from 'vue-native-websocket'
import VueFeather from 'vue-feather'
import vuetwemoji from 'vue-twemoji'

const https = require('https')

Vue.use(vuetwemoji, {
  extension: '.svg',
  size: 'svg'
})

Vue.use(VueNativeSock, 'ws://', {
  format: 'json',
  reconnection: true,
  connectManually: true,
})

Vue.use(VueFeather)

Vue.config.productionTip = false
Vue.prototype.$http = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

Vue.mixin(mixins)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
