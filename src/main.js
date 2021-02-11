import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import filters from './filters'
import mixins from './mixin'
import axios from 'axios'
import VueNativeSock from 'vue-native-websocket'
import VueFeather from 'vue-feather'
import Twemoji from './plugins/Twemoji'
import linkify from 'vue-linkify'
import $ from 'jquery'
import Popover from 'vue-js-popover'
window.$ = $

const https = require('https')

Vue.use(Twemoji, {
  extension: '.svg',
  size: 'svg'
})
Vue.use(VueNativeSock, 'ws://', {
  format: 'json',
  reconnection: true,
  connectManually: true,
})
Vue.use(VueFeather)
Vue.use(Popover, { tooltip: true })

Vue.config.productionTip = false
Vue.prototype.$http = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

Vue.mixin(mixins)

Vue.directive('linkified', linkify)

axios.defaults.headers.common['Authorization'] = store.state.password

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
