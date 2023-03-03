import { ipcRenderer } from 'electron'
import * as remote from '@electron/remote'
import emojiRegex from 'emoji-regex'
import { nextTick, onMounted, getCurrentInstance, reactive, ComponentInternalInstance, watch } from 'vue'
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router'
import { state as messagesState, fetchMessages } from './messages'

let route: Nullable<RouteLocationNormalizedLoaded> = null
let currentInstance: Nullable<ComponentInternalInstance> = null

const state = reactive({
  lastHeight: null as Nullable<number>,
  ignoreNextScroll: false,
})

const scrollToBottom = () => {
  if (currentInstance?.refs.messagesContainer) {
    const container = currentInstance.refs.messagesContainer as HTMLElement
    const scrollTo = state.lastHeight ? container.scrollHeight - state.lastHeight : container.scrollHeight

    container.scrollTop = scrollTo

    $(document).off('click', '.message a[href^="http"]')
    $(document).on('click', '.message a[href^="http"]', function(event) {
      event.preventDefault()
      remote.shell.openExternal(this.href)
    })

    if (state.lastHeight == null) {
      const messageInputRef = currentInstance?.refs.messageInput as HTMLElement
      setTimeout(() => messageInputRef?.focus(), 10)
    }
  } else {
    setTimeout(scrollToBottom, 1)
  }
}

const postLoad = (initial: boolean) => {
  nextTick(() => {
    if (!currentInstance) return
    const container = currentInstance.refs.messagesContainer as HTMLElement

    if (container) {
      if (initial) {
        container.addEventListener('scroll', () => {
          if (state.ignoreNextScroll && state.lastHeight == null) {
            state.ignoreNextScroll = false
            return
          }

          if (container.scrollHeight - (container.scrollTop + container.offsetHeight) <= 20) {
            state.lastHeight = null
            currentInstance?.emit('markAsRead', route?.params.id)
          } else state.lastHeight = container.scrollHeight - container.scrollTop

          if (container.scrollTop == 0 && !messagesState.loading) {
            fetchMessages()
          }
        })
      }

      state.ignoreNextScroll = true
      scrollToBottom()

      messagesState.offset += messagesState.limit
      messagesState.loading = false
    } else {
      setTimeout(() => postLoad(initial), 1)
      return
    }

    currentInstance.emit('markAsRead', route?.params.id)
  })
}

const isEmojis = (msgText: string) => {
  const regex = emojiRegex()
  msgText = msgText.replace(/\u{fffc}/gu, '')

  return (
    msgText.replace(' ', '').replace(regex, '').length == 0 &&
    (msgText.match(regex) || []).length <= 8 &&
    msgText.replace(' ', '').length != 0
  )
}
const isImage = (type: string) => {
  return type.includes('image/')
}

const isVideo = (type: string) => {
  return type.includes('video/')
}

const isAudio = (file: string) => {
  const ext = file.split('.').pop()
  const formats = ['mp3', 'caf', 'wav', 'flac', 'm4a', 'wma', 'aac']
  return ext ? formats.includes(ext.toLowerCase()) : false
}

const attachmentLoaded = () => {
  state.ignoreNextScroll = true
  scrollToBottom()
}

const rightClickMessage = (args: object) => {
  ipcRenderer.send('rightClickMessage', args)
}

const autoCompleteHooks = () => {
  if (route?.params.id == 'new') {
    nextTick(() => {
      const input = document.getElementsByClassName('autocomplete-input')[0] as HTMLElement
      if (input) {
        input.focus()
        input.addEventListener('input', () => {
          messagesState.receiver = ''
        })
      }
    })
  }
}

const autoCompleteInput = (input: { name: string; phone: string } | string) => {
  const inputObj = input as { name: string; phone: string }

  if (inputObj && inputObj.name) {
    messagesState.receiver = inputObj.phone
  } else if (/^\+\d{11,16}/gi.test(input as string)) {
    messagesState.receiver = input as string
  } else if (/^([a-zA-Z0-9_.+-])+@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,6})+$/.test(input as string)) {
    messagesState.receiver = input as string
  }
}

export { postLoad, scrollToBottom, autoCompleteHooks, autoCompleteInput, state }

export default () => {
  route = useRoute()
  currentInstance = getCurrentInstance()

  const init = () => {
    state.lastHeight = null
    state.ignoreNextScroll = false
    autoCompleteHooks()
  }

  onMounted(init)
  watch(() => route?.params.id, init)

  return {
    postLoad,
    scrollToBottom,
    isEmojis,
    isImage,
    isVideo,
    isAudio,
    attachmentLoaded,
    rightClickMessage,
    autoCompleteInput,
  }
}
