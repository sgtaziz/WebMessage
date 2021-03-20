import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import directives from './directives'
import filters from './filters'
import axios from 'axios'
import https from 'https'
import VueNativeSock from 'vue-native-websocket-vue3'
import VueFeather from 'vue-feather'
import linkify from 'vue-linkify'
import jQuery from 'jquery'
// import * as VueConfirmDialog from 'vue-confirm-dialog'
import { longClickDirective } from 'vue-long-click'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHeart, faThumbsUp, faThumbsDown, faLaughSquint, faExclamation, faQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import VueLazyImage from '@techassi/vue-lazy-image'

declare global {
  interface Window {
    $: JQueryStatic
    jQuery: JQueryStatic
  }
}

window.$ = jQuery
window.jQuery = jQuery
// import 'imagesloaded'
const app = createApp(App)
  .use(store)
  .use(router)

app.use(VueNativeSock, 'ws://', {
  format: 'json',
  reconnection: true,
  connectManually: true,
})
// app.use(Popover, { tooltip: true })
// app.use(VueConfirmDialog)
app.use(VueLazyImage)

library.add(faHeart)
library.add(faThumbsUp)
library.add(faThumbsDown)
library.add(faLaughSquint)
library.add(faExclamation)
library.add(faQuestion)

app.component('font-awesome-icon', FontAwesomeIcon)
app.component('font-awesome-layers', FontAwesomeLayers)
app.component('feather', VueFeather)
// app.component('vue-confirm-dialog', VueConfirmDialog.default)

// app.config.productionTip = false
axios.defaults.headers.common['Authorization'] = store.state.password
app.provide(
  '$http',
  axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  })
)

app.directive('linkified', linkify)
app.directive('longclick', longClickDirective({ delay: 800, interval: 0 }))

app.directive('click-outside', {
  beforeMount: (el, binding) => {
    el.clickOutsideEvent = (event: MouseEvent) => {
      const target = event.target as Element

      if (!(el == event.target || el.contains(event.target)) && !$('.emojiBtn').has(target).length) {
        binding.value(event)
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted: el => {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  },
})

app.config.globalProperties.$filters = filters
directives(app)

app.mount('#app')

export default app
