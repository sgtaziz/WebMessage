import { onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import { sendSocket, state as messagesState } from './messages'

const state = reactive({
  interval: null as Nullable<NodeJS.Timeout>,
  timeHolding: 0,
  initialX: null as Nullable<number>,
  initialY: null as Nullable<number>,
  reactingMessage: null as Nullable<JQuery<HTMLElement>>,
  reactingMessageGUID: null as Nullable<string>,
  reactingMessageReactions: null as Nullable<object>,
  reactingMessagePart: 0,
  reactingToBalloon: false,
})

const openReactionMenu = (msgId: string, textId: string, guid: string, reactions: object, part: number, balloon: boolean) => {
  const el = $('#msg' + msgId + '-text' + textId + '-part' + part)
  state.reactingMessageReactions = reactions
  state.reactingMessageGUID = guid
  state.reactingMessagePart = part
  state.reactingMessage = el
  state.reactingToBalloon = balloon
}

const startInterval = (msgId: string, textId: string, guid: string, reactions: object, part: number, balloon: boolean) => {
  if (!state.interval) {
    state.interval = setInterval(() => {
      state.timeHolding++
      if (state.timeHolding > 7) {
        //> 0.7 seconds, will trigger at 0.8 seconds
        openReactionMenu(msgId, textId, guid, reactions, part, balloon)
        if (state.interval) clearInterval(state.interval)
        state.interval = null
        state.timeHolding = 0
      }
    }, 100)
  }
}

const stopInterval = () => {
  if (state.interval) clearInterval(state.interval)
  state.interval = null
  state.timeHolding = 0
  state.initialX = null
  state.initialY = null
}

const stopIntervalWhen = (e: MouseEvent) => {
  if (state.interval) {
    if (!state.initialX) state.initialX = e.clientX
    if (!state.initialY) state.initialY = e.clientY

    if (Math.abs(state.initialX - e.clientX) > 4 || Math.abs(state.initialY - e.clientY) > 4) {
      stopInterval()
    }
  }
}

const closeReactionMenu = () => {
  state.reactingMessage = null
  state.reactingMessageGUID = null
  state.reactingMessageReactions = null
  state.reactingMessagePart = 0
}

const sendReaction = (reactionId: string, guid: string, part: string) => {
  if (!messagesState.messages[0]) return
  console.log(reactionId, guid, part)
  sendSocket({
    action: 'sendReaction',
    data: {
      chatId: messagesState.messages[0].chatId,
      guid: guid,
      reactionId: reactionId,
      part: part,
    },
  })
}

export default () => {
  const route = useRoute()

  const init = () => {
    state.reactingMessage = null
    state.reactingMessageGUID = null
    state.reactingMessageReactions = null
    state.reactingMessagePart = 0
    state.interval = null
    state.timeHolding = 0
    state.initialX = null
    state.initialY = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipcRenderer.on('reactToMessage', (_e: IpcRendererEvent, args: any) => {
      openReactionMenu(args.id, args.ii, args.guid, args.reactions, args.part, args.balloon)
    })
  }

  onMounted(init)
  watch(() => route?.params.id, init)

  return {
    openReactionMenu,
    startInterval,
    stopInterval,
    stopIntervalWhen,
    closeReactionMenu,
    sendReaction,
    state,
  }
}
