import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import mixins from './mixin'
import axios from 'axios'
import VueNativeSock from 'vue-native-websocket'
import VueFeather from 'vue-feather'
// import Twemoji from './plugins/Twemoji'
import linkify from 'vue-linkify'
import $ from 'jquery'
import Popover from 'vue-js-popover'
import VueConfirmDialog from 'vue-confirm-dialog'
import { longClickDirective } from 'vue-long-click'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHeart, faThumbsUp, faThumbsDown, faLaughSquint, faExclamation, faQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { VLazyImagePlugin } from "v-lazy-image"
import rangy from 'rangy'
require('rangy/lib/rangy-selectionsaverestore')

window.$ = $
window.jQuery = $
require('imagesloaded')
import './filters'

const https = require('https')

// Vue.use(Twemoji, {
//   extension: '.svg',
//   size: 'svg'
// })
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
Vue.component('font-awesome-layers', FontAwesomeLayers)
Vue.component('vue-confirm-dialog', VueConfirmDialog.default)

Vue.config.productionTip = false
Vue.prototype.$http = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

Object.defineProperty(Vue.prototype, '$rangy', { value: rangy })

Vue.mixin(mixins)

Vue.directive('linkified', linkify)
Vue.directive('longclick', longClickDirective({ delay: 800, interval: 0 }))
Vue.directive('click-outside', {
  bind: (el, binding, vnode) => {
    el.clickOutsideEvent = (event) => {
      if (!(el == event.target || el.contains(event.target)) && !$('.emojiBtn').has($(event.target)).length) {
        binding.value(event)
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unbind: (el) => {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  },
})


axios.defaults.headers.common['Authorization'] = store.state.password

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
