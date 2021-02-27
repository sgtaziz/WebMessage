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
import VueConfirmDialog from 'vue-confirm-dialog'
import { longClickDirective } from 'vue-long-click'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHeart, faThumbsUp, faThumbsDown, faLaughSquint, faExclamation, faQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { VLazyImagePlugin } from "v-lazy-image"

window.$ = $
window.jQuery = $
require('imagesloaded')

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
Vue.use(VueConfirmDialog)
Vue.use(VLazyImagePlugin)

library.add(faHeart)
library.add(faThumbsUp)
library.add(faThumbsDown)
library.add(faLaughSquint)
library.add(faExclamation)
library.add(faQuestion)

Vue.component('font-awesome-icon', FontAwesomeIcon)
Vue.component('vue-confirm-dialog', VueConfirmDialog.default)

Vue.config.productionTip = false
Vue.prototype.$http = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

Vue.mixin(mixins)

Vue.directive('linkified', linkify)
Vue.directive('longclick', longClickDirective({ delay: 800, interval: 0 }))


axios.defaults.headers.common['Authorization'] = store.state.password

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
