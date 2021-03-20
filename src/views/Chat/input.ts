import { ComponentInternalInstance, getCurrentInstance, nextTick, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import emojiData from 'emoji-mart-vue-fast/data/all.json'
import { EmojiIndex } from 'emoji-mart-vue-fast/src/index'
import rangy from 'rangy'
import filters from '@/filters'
import 'rangy/lib/rangy-selectionsaverestore'
import { state as messagesState, sendSocket } from './messages'
import axios from 'axios'
import { useStore } from 'vuex'

let currentInstance: Nullable<ComponentInternalInstance> = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const $rangy = rangy as any

interface TextObj {
  [key: string]: string
}

const state = reactive({
  messageText: {} as TextObj,
  subjectText: {} as TextObj,
  canSend: true,
  hasAttachments: false,
  lastTypingValue: '',
  lastTypingStamp: 0,
  hasDataToSend: false,
  lastFocus: null as Nullable<{ target?: JQuery<HTMLElement>; selection?: Range; lastSavedPos?: object }>,
  showEmojiMenu: false,
  emojiIndex: new EmojiIndex(emojiData),
})

export default () => {
  const watchRoute = useRoute()
  const store = useStore()
  currentInstance = getCurrentInstance()

  const init = () => {
    state.canSend = true
    state.hasAttachments = false
    state.lastTypingValue = ''
    state.lastTypingStamp = 0
    state.hasDataToSend = false
    state.lastFocus = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (currentInstance?.refs.uploadButton) (currentInstance?.refs.uploadButton as any).clear()

    if (currentInstance?.refs.messageInput) {
      const input = currentInstance.refs.messageInput as HTMLElement
      input.innerHTML = state.messageText[watchRoute.params.id as string] ?? ''
    }

    if (currentInstance?.refs.subjectInput) {
      const input = currentInstance.refs.subjectInput as HTMLElement
      input.innerHTML = state.subjectText[watchRoute.params.id as string] ?? ''
    }
  }

  const sendTypingIndicator = (value: string) => {
    if (state.lastTypingValue == value || !messagesState.messages[0]) return
    if (Date.now() - state.lastTypingStamp <= 55000 && value != '' && state.lastTypingValue != '') return
    state.lastTypingValue = value
    state.lastTypingStamp = Date.now()

    if (value != '') {
      sendSocket({
        action: 'setIsLocallyTyping',
        data: {
          chatId: messagesState.messages[0].chatId,
          typing: true,
        },
      })
    } else {
      sendSocket({
        action: 'setIsLocallyTyping',
        data: {
          chatId: messagesState.messages[0].chatId,
          typing: false,
        },
      })
    }
  }

  const sendText = () => {
    if (!state.canSend) return

    let messageText = state.messageText[watchRoute.params.id as string] || ''
    let subjectText = state.subjectText[watchRoute.params.id as string] || ''

    if (messageText == '' && subjectText != '') {
      messageText = subjectText
      subjectText = ''
    }

    if (
      messageText == '' &&
      (!currentInstance?.refs.uploadButton ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !(currentInstance?.refs.uploadButton as any).attachments ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentInstance?.refs.uploadButton as any).attachments.length == 0)
    )
      return

    state.canSend = false

    const textObj = {
      text: messageText,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attachments: currentInstance?.refs.uploadButton ? (currentInstance?.refs.uploadButton as any).attachments : [],
      address: messagesState.messages[0] ? messagesState.messages[0].chatId : messagesState.receiver,
      subject: subjectText,
    }

    axios
      .post(store.getters.httpURI + '/sendText', textObj)
      .then(() => {
        const focusedEl = $(document.activeElement as HTMLElement).attr('id')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uploadButtonRef = currentInstance?.refs.uploadButton as any

        if (uploadButtonRef) {
          uploadButtonRef.clear()
        }

        nextTick(() => $('#' + focusedEl).focus())

        delete state.messageText[watchRoute.params.id as string]
        delete state.subjectText[watchRoute.params.id as string]

        const messageInputRef = currentInstance?.refs.messageInput as HTMLElement
        const subjectInputRef = currentInstance?.refs.subjectInput as HTMLElement
        if (messageInputRef) {
          messageInputRef.innerHTML = ''
        }
        if (subjectInputRef) {
          subjectInputRef.innerHTML = ''
        }

        state.canSend = true
        state.hasDataToSend = false
      })
      .catch(error => {
        alert('There was an error while sending your text.\n' + error)
        state.canSend = true
      })
  }

  const previewFiles = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadButtonRef = currentInstance?.refs.uploadButton as any
    state.hasAttachments = uploadButtonRef && uploadButtonRef.attachments != null && uploadButtonRef.attachments.length > 0
    state.hasDataToSend =
      (state.messageText[watchRoute.params.id as string] != '' && state.messageText[watchRoute.params.id as string] != null) ||
      (state.subjectText[watchRoute.params.id as string] != '' && state.subjectText[watchRoute.params.id as string] != null) ||
      state.hasAttachments
  }

  const removeAttachment = (i: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadButtonRef = currentInstance?.refs.uploadButton as any
    if (!state.canSend) return
    uploadButtonRef?.remove(i)
  }

  const enterKey = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    sendText()
  }

  const shiftEnterKey = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()

    if (
      (e.target as HTMLElement).innerHTML === '' ||
      (e.target as HTMLElement).innerHTML[(e.target as HTMLElement).innerHTML.length - 1] !== '\n'
    ) {
      document.execCommand('insertHTML', false, '\n')
    }
    document.execCommand('insertHTML', false, '\n')
  }

  const messageInputPasted = (e: ClipboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    let paste = e.clipboardData?.getData('text/plain') as string
    paste = filters.escapeHTML(paste)
    document.execCommand('insertHTML', false, paste)
  }

  const messageInputChanged = (e: Event) => {
    const target = e.target as HTMLElement
    let content = filters.nativeEmoji(filters.colonEmoji(target.innerHTML))

    if (content != target.innerHTML) {
      const savedPos = $rangy.saveSelection()
      content = filters.nativeEmoji(filters.colonEmoji(target.innerHTML))

      target.innerHTML = content ?? ''
      $rangy.restoreSelection(savedPos)
    }

    const rawContent = filters.unescapeHTML((e.target as HTMLElement).innerHTML.replace(/<img.*?native="(.*?)"[^>]+>/g, '$1'))

    if ($(e.target as HTMLElement).hasClass('messageInput')) {
      state.messageText[watchRoute.params.id as string] = rawContent
    } else if ($(e.target as HTMLElement).hasClass('subjectInput')) {
      state.subjectText[watchRoute.params.id as string] = rawContent
    }

    state.hasDataToSend =
      (state.messageText[watchRoute.params.id as string] != '' && state.messageText[watchRoute.params.id as string] != null) ||
      (state.subjectText[watchRoute.params.id as string] != '' && state.subjectText[watchRoute.params.id as string] != null) ||
      state.hasAttachments

    sendTypingIndicator(rawContent)
  }

  const handleBlur = (e: FocusEvent) => {
    if (e.relatedTarget && (e.relatedTarget as HTMLInputElement).placeholder == 'Search') return
    state.lastFocus = {
      target: $(e.target as HTMLElement),
      selection: window.getSelection()?.getRangeAt(0),
    }
  }

  const insertEmoji = (emoji: EmojiObject) => {
    if (!state.lastFocus) state.lastFocus = { target: $(currentInstance?.refs.messageInput as HTMLElement) }
    if (!state.lastFocus.target) state.lastFocus.target = $(currentInstance?.refs.messageInput as HTMLElement)

    const emojiComponent = filters.emojiComponent(emoji)

    if (state.lastFocus.selection) {
      state.lastFocus.target.focus()
      const range = state.lastFocus.selection
      const node = emojiComponent.get(0)
      const windowRange = window.getSelection()?.getRangeAt(0)
      // this.lastFocus.lastSavedPos = this.$rangy.saveSelection()

      range.insertNode(node)
      state.lastFocus.selection.setEndAfter(node)
      state.lastFocus.selection.setStartAfter(node)
      windowRange?.setEndAfter(node)
      windowRange?.setStartAfter(node)
      if (state.lastFocus.lastSavedPos) $rangy.restoreSelection(state.lastFocus.lastSavedPos)
    } else {
      state.lastFocus.target.append(emojiComponent)
    }

    messageInputChanged(({ target: state.lastFocus.target.get(0) } as unknown) as Event)
  }

  const toggleEmojiMenu = () => {
    state.showEmojiMenu = !state.showEmojiMenu

    if (state.lastFocus) {
      state.lastFocus.target?.focus()
      if (state.lastFocus.selection)
        window.getSelection()?.collapse(state.lastFocus.selection.startContainer, state.lastFocus.selection.startOffset)
    }
  }

  const hideEmojiMenu = () => {
    if (!state.showEmojiMenu) return
    state.showEmojiMenu = false
  }

  onMounted(init)
  watch(() => watchRoute.params.id, init)

  return {
    enterKey,
    shiftEnterKey,
    previewFiles,
    removeAttachment,
    messageInputPasted,
    messageInputChanged,
    handleBlur,
    insertEmoji,
    toggleEmojiMenu,
    hideEmojiMenu,
    state,
  }
}
