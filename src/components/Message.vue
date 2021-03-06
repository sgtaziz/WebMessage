<template>
  <transition name="fade" mode="out-in">
    <div class="messageContainer" ref="messageContainer" :key="$route.params.id">
      <div class="titlebar">
        <div class="receiverContainer">
          <span class="label">To:</span>
          <span class="contact" v-if="messages[0] && $route.params.id != 'new'" v-html="$options.filters.twemoji(messages[0].name)"></span>
          <span class="contact" v-else-if="$route.params.id == 'new'" style="overflow: visible;">
            <autocomplete :search="search" :get-result-value="getResultValue" @submit="onSubmit"></autocomplete>
          </span>
        </div>
        <div class="closeBtn" @click="$router.push('/')">
          <feather type="x-circle" stroke="rgba(255,255,255,0.6)" size="16"></feather>
        </div>
      </div>

      <div v-if="(!messages || messages.length == 0) && $route.params.id != 'new'" style="height:100%;padding:14px;">
        <img src="@/assets/loading.webp" style="height:18px;" />
      </div>
      <template v-else-if="$route.params.id != 'new' || this.receiver != ''">
        <reactionMenu :target="reactingMessage" :reactions="reactingMessageReactions" :guid="reactingMessageGUID" :part="reactingMessagePart" :balloon="reactingToBalloon" @close="closeReactionMenu" @sendReaction="sendReaction"></reactionMenu>
        <simplebar class="messages" ref="messages">
          <div v-for="(msg, i) in sortedMessages" :key="'msg'+msg.id">
            <div class="timegroup" v-html="dateGroup(i-1, i)" v-if="dateGroup(i-1, i) != ''"></div>
            <div v-if="msg.group && msg.sender != 1" class="senderName" v-html="$options.filters.twemoji(msg.author)"></div>

            <div :ref="'msg'+msg.id" :class="(msg.sender == 1 ? 'send ' : 'receive ') + msg.type + (sortedMessages.length-1 == i ? ' last' : '')" class="messageGroup">
              <div class="authorAvatar" v-if="msg.group && msg.sender != 1">
                <avatar :username="msg.author" :size="28" inline :customStyle="{ fontSize: '10px', fontWeight: '400' }"
                  :src="`${$store.getters.httpURI}/contactimg?docid=${msg.authorDocid}&auth=${encodeURIComponent($store.state.password)}`"
                />
              </div>

              <div class="groupWrapper">
                <template v-for="(text, ii) in msg.texts">
                  <div :key="'wrapper'+ii" :id="'msg'+msg.id+'-text'+ii" class="textWrapper">
                    <div
                      v-for="(attachment, index) in text.attachments" :key="`${ii}-${index}`"
                      class="attachment" :id="'msg'+msg.id+'-text'+ii+'-part'+index" 
                      @mousedown.left="startInterval(msg.id, ii, text.guid, text.reactions, index)"
                      @mouseup.left="stopInterval" @mouseleave="stopInterval" @mousemove="stopIntervalWhen"
                      @click.right="rightClickMessage({ id: msg.id, ii, guid: text.guid, reactions: text.reactions, part: index })">
                      <reactions :click="() => openReactionMenu(msg.id, ii, text.guid, text.reactions, index)"
                        :target="'#msg'+msg.id+'-text'+ii" :part="index" :reactions="text.reactions"
                        :targetFromMe="msg.sender == 1"></reactions>
                      <template v-if="attachment[0] != '' && !attachment[0].endsWith('.pluginPayloadAttachment')">
                        <expandable-image v-if="isImage(attachment[1])"  :loadedData="attachmentLoaded" :path="attachment[0]" :type="attachment[1]" />
                        <video-player v-else-if="isVideo(attachment[1])" :loadedData="attachmentLoaded" :path="attachment[0]" :type="attachment[1]" />
                        <audio-player v-else-if="isAudio(attachment[0])" :loadedData="attachmentLoaded" :path="attachment[0]" :type="attachment[1]" />
                        <download-attachment v-else :path="attachment[0]" :type="attachment[1]" />
                      </template>
                    </div>

                    <div v-if="$options.filters.twemoji(text.text) != '' || text.undisplayable" :id="'msg'+msg.id+'-text'+ii+'-part'+text.attachments.length" class="bubbleWrapper">
                      <reactions :click="() => openReactionMenu(msg.id, ii, text.guid, text.reactions, text.attachments.length, text.balloon)"
                        :target="'#msg'+msg.id+'-text'+ii" :part="text.attachments.length" 
                        :reactions="text.reactions" :targetFromMe="msg.sender == 1" :balloon="text.balloon"></reactions>
                      <div
                        class="message"
                        @mousedown.left="startInterval(msg.id, ii, text.guid, text.reactions, text.attachments.length, text.balloon)" @mouseup.left="stopInterval" @mouseleave="stopInterval"
                        @mousemove="stopIntervalWhen" @click.right="rightClickMessage({ id: msg.id, ii, guid: text.guid, reactions: text.reactions, part: text.attachments.length, balloon: text.balloon })"
                        :key="'msg'+msg.id+'-text'+ii"
                        :class="{ last: msg.texts.length-1 == ii, jumbo: isEmojis(text.text), payload: text.undisplayable || text.payload }"
                        :style="msg.sender == 1 && text.showStamp && (text.read > 0 || text.delivered > 0) ? 'margin-bottom: 0px;' : ''">
                        <div class="subject" v-if="text.subject && text.subject != ''" v-html="$options.filters.twemoji(text.subject)"></div>

                        <span style="white-space: pre-wrap;" v-if="!text.undisplayable && !text.payload" v-html="$options.filters.twemoji(text.text)" v-linkified></span>
                        <payload-attachment v-else-if="!text.undisplayable && text.payload" :payloadData="text.payload" :loadedData="attachmentLoaded" @refreshRequest="reloadMessage(text.guid)" />
                        <unsupported-message v-else />
                      </div>
                    </div>

                    <div class="receipt" :key="'msg'+msg.id+'-text'+ii+'-receipt'" v-if="msg.sender == 1 && text.showStamp && (text.read > 0 || text.delivered > 0)">
                      <span class="type">{{ text.read > 0 ? "Read" : "Delivered" }}</span> {{ humanReadableTimestamp(text.read > 0 ? text.read : text.delivered) }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="messageGroup receive last" v-if="$store.state.isTyping[$route.params.id]">
              <div class="textWrapper">
                <typing-indicator></typing-indicator>
              </div>
          </div>
        </simplebar>

        <div class="textboxContainer">
          <div class="attachmentPreview" v-if="hasAttachments">
            <div class="attachment" v-for="(attachment, i) in this.$refs.uploadButton.attachments" :key='i'>
              <div class="removeAttachment" @click="removeAttachment(i)">
                <feather type="x-circle" fill="rgb(152,152,152)" stroke="rgb(29,29,29)" size="16"></feather>
              </div>
              {{ attachment.name }}
            </div>
          </div>
          <div class="msgTextboxWrapper">
            <input type="text" v-model="subjectInput" v-if="$store.state.subjectLine" class="subjectLine" id="subjectInput" ref="subjectLine" placeholder="Subject"
              @keyup.enter.exact="sendText" @keyup="sendTypingIndicator(subjectInput)" :class="{ noTopBorder: hasAttachments }">
            <twemoji-textarea @contentChanged="autoResize" :placeholder="this.messages[0] ? this.messages[0].type.replace('SMS', 'Text Message') : 'Send a message'"
              :emojiData="emojiDataAll"
              :emojiGroups="emojiGroups"
              :recentEmojisFeat="true"
              recentEmojisStorage="local"
              :searchEmojisFeat="true"
              :initialContent="messageText[$route.params.id]"
              :class="(hasAttachments || $store.state.subjectLine) ? 'noTopBorder' : ''"
              @enterKey="sendText">
              <template v-slot:twemoji-picker-button>
                <feather type="smile" fill="rgb(152,152,152)" stroke="rgb(29,29,29)" size="26" style="margin-top: -1px;"></feather>
              </template>
            </twemoji-textarea>
          </div>
          <img src="@/assets/loading.webp" style="height:26px;float:right;" v-if="!canSend" />
          <upload-button v-show="canSend" ref="uploadButton" :enableiMessageAttachments="this.messages[0] && this.messages[0].type == 'iMessage'" @filesChanged="previewFiles" />
          <div class="sendBtn" :class="{ cantSend: !canSend || !hasDataToSend, SMS: this.messages[0] && this.messages[0].type == 'SMS' }" @click="sendText">
            <feather type="arrow-up" size="20"></feather>
          </div>
        </div>
      </template>
    </div>
  </transition>
</template>

<script>
import simplebar from 'simplebar-vue'
import moment from 'moment'
import {
  TwemojiTextarea
} from '@kevinfaguiar/vue-twemoji-picker'
import EmojiAllData from '@kevinfaguiar/vue-twemoji-picker/emoji-data/en/emoji-all-groups.json'
import EmojiGroups from '@kevinfaguiar/vue-twemoji-picker/emoji-data/emoji-groups.json'
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@trevoreyre/autocomplete-vue/dist/style.css'
import VideoPlayer from './VideoPlayer'
import ExpandableImage from './ExpandableImage'
import DownloadAttachment from './DownloadAttachment'
import UploadButton from './UploadButton'
import ReactionMenu from './ReactionMenu'
import Reactions from './Reactions'
import axios from 'axios'
import { parseBuffer } from 'bplist-parser'
import TypingIndicator from './TypingIndicator.vue'
import PayloadAttachment from './PayloadAttachment.vue'
import Avatar from './Avatar.vue'
import AudioPlayer from './AudioPlayer.vue'
import UnsupportedMessage from './UnsupportedMessage.vue'

export default {
  name: 'Message',
  components: {
    simplebar,
    TwemojiTextarea,
    Autocomplete,
    VideoPlayer,
    ExpandableImage,
    DownloadAttachment,
    UploadButton,
    ReactionMenu,
    Reactions,
    TypingIndicator,
    PayloadAttachment,
    Avatar,
    AudioPlayer,
    UnsupportedMessage,
  },
  data: function () {
    return {
      messages: [],
      messageText: {},
      limit: 25,
      offset: 0,
      receiver: '',
      lastHeight: null,
      ignoreNextScroll: false,
      loading: false,
      canSend: true,
      hasAttachments: false,
      interval: null,
      timeHolding: 0,
      initialX: null,
      initialY: null,
      reactingMessage: null,
      reactingMessageGUID: null,
      reactingMessageReactions: null,
      reactingMessagePart: 0,
      reactingToBalloon: false,
      subjectInput: '',
      lastTypingValue: ''
    }
  },
  computed: {
    emojiDataAll() {
      let data = EmojiAllData.filter((obj) => {
        return true//obj.group != 2
      })
      return data
    },
    emojiGroups() {
      let groups = EmojiGroups.filter((obj) => {
        return true//obj.description != '🦲'
      })
      return groups
    },
    hasDataToSend() {
      let messageText = this.messageText[this.$route.params.id] ? this.messageText[this.$route.params.id] : ''
      let subjectText = this.subjectInput

      return messageText != '' || subjectText != '' || this.hasAttachments
    },
    sortedMessages() {
      // let messages = this.messages.sort((a, b) => (b.date - a.date > 0 ? 1 : -1))
      let messages = this.messages
      let lastSentMessageFound = false
      let lastReadMessageFound = false

      const groupDates = (date1, date2) => (date2 - date1 < 3600000)
      const groupAuthor = (author1, author2) => (author1 == author2)

      const groupedMessages = messages.reduce((r, { text, subject, dateRead, dateDelivered, guid, reactions, balloonReactions, payload, attachments, balloonBundle, ...rest }, i, arr) => {
        const prev = arr[i +-1]
        let extras = { }

        if (payload) {
          try {
            const data = new Buffer.from(payload, 'base64')
            const payloadBuffer = parseBuffer(data)
            let parsedData = {}
            let lastClassname = 'root'

            payloadBuffer[0].$objects.forEach(object => {
              if (object.$classname) lastClassname = object.$classname
              if (typeof object != 'string' || object == 'website' || object == '$null' || object.startsWith('image/')) return
              if (lastClassname == 'NSUUID') throw Error('MSMessage payload')
              if (!parsedData[lastClassname]) parsedData[lastClassname] = []

              parsedData[lastClassname].push(object)
            })

            extras.payload = parsedData
          } catch (error) {
            extras.undisplayable = true
          }

          let supportedFormats = ['', 'com.apple.messages.URLBalloonProvider']
          if (!extras.undisplayable && balloonBundle && !supportedFormats.includes(balloonBundle)) {
            extras.undisplayable = true
            attachments = []
          }
        }

        if (prev && groupAuthor(rest.author, prev.author) && groupAuthor(rest.sender, prev.sender) && groupDates(rest.date, prev.date)) {
          r[r.length - 1].texts.unshift({
            text: text,
            subject: subject,
            date: rest.date,
            attachments: attachments,
            read: dateRead,
            delivered: dateDelivered,
            guid: guid,
            reactions:
            reactions,
            showStamp: rest.sender == 1 && (!lastSentMessageFound || (!lastReadMessageFound && dateRead > 0)),
            balloon: balloonBundle != null,
            ...extras
          })
        } else {
          r.push({
            ...rest,
            texts: [{
              text: text,
              subject: subject,
              date: rest.date,
              attachments: attachments,
              read: dateRead,
              delivered: dateDelivered,
              guid: guid,
              reactions: reactions,
              showStamp: rest.sender == 1 && (!lastSentMessageFound || (!lastReadMessageFound && dateRead > 0)),
              balloon: balloonBundle != null,
              ...extras
            }]
          })
        }

        if (rest.sender == 1 && !lastSentMessageFound) lastSentMessageFound = true
        if (rest.sender == 1 && (!lastReadMessageFound && dateRead > 0)) lastReadMessageFound = true
        
        return r
      }, [])

      return groupedMessages.reverse()
    }
  },
  watch: {
    $route(to, from) {
      this.offset = 0
      this.messages = []
      this.lastHeight = null
      this.loading = false
      this.ignoreNextScroll = false
      this.canSend = true
      this.hasAttachments = false
      this.reactingMessage = null
      this.reactingMessageGUID = null
      this.reactingMessageReactions = null
      this.reactingMessagePart = 0
      this.subjectInput = ''
      if (this.$refs.uploadButton) {
        this.$refs.uploadButton.clear()
      }
      if (this.$refs.subjectLine) {
        this.$refs.subjectLine.value = ''
      }

      this.autoCompleteHooks()
      this.fetchMessages()

      var textarea = document.getElementById("twemoji-textarea")
      if (textarea) textarea.innerHTML = this.$twemoji.parse(this.messageText[this.$route.params.id] || "")
    }
  },
  methods: {
    isImage(type) {
      return type.includes('image/')
    },
    isVideo(type) {
      return type.includes('video/')
    },
    isAudio(file) {
      let ext = file.split('.').pop()
      let formats = ['mp3', 'caf', 'wav', 'flac', 'm4a', 'wma', 'aac']
      return formats.includes(ext.toLowerCase())
    },
    rightClickMessage(args) {
      ipcRenderer.send('rightClickMessage', args)
    },
    startInterval (msgId, textId, guid, reactions, part, balloon) {
      if (!this.interval) {
        this.interval = setInterval(() => {
          this.timeHolding++
          if (this.timeHolding > 7) { //> 0.7 seconds, will trigger at 0.8 seconds
            this.openReactionMenu(msgId, textId, guid, reactions, part, balloon)
            clearInterval(this.interval)
            this.interval = false
            this.timeHolding = 0
          }
        }, 100)
      }
    },
    stopInterval () {
      clearInterval(this.interval)
      this.interval = false
      this.timeHolding = 0
      this.initialX = null
      this.initialY = null
    },
    stopIntervalWhen (e) {
      if (this.interval) {
        if (!this.initialX) this.initialX = e.clientX
        if (!this.initialY) this.initialY = e.clientY

        if (Math.abs(this.initialX - e.clientX) > 4 || Math.abs(this.initialY - e.clientY) > 4) {
          this.stopInterval()
        }
      }
    },
    closeReactionMenu () {
      this.reactingMessage = null
      this.reactingMessageGUID = null
      this.reactingMessageReactions = null
      this.reactingMessagePart = 0
    },
    dateGroup(prev, current) {
      let prevstamp = this.sortedMessages[prev] ? this.sortedMessages[prev].texts[0].date : 0
      let currstamp = this.sortedMessages[current].texts[0].date
      let today = new Date().setHours(0,0,0,0)

      if (prev == -1 || currstamp - prevstamp > 3600000) {
        let humanReadableStamp = this.humanReadableDay(currstamp)
        return `<span class="bold">${humanReadableStamp}</span> ${moment(currstamp).format('LT')}`
      } else {
        return ""
      }
    },
    search (input) {
      const url = `${this.$store.getters.httpURI}/search?text=${encodeURIComponent(input)}&auth=${encodeURIComponent(this.$store.state.password)}`

      return new Promise((resolve) => {
        if (input.length < 2) {
          return resolve([])
        }

        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            resolve(data.slice(0, 7))
          })
      })
    },
    getResultValue (result) {
      return result.name + ` (${result.phone})`
    },
    onSubmit (result) {
      if (result && result.personId) {
        this.$router.push('/message/'+result.personId)
      } else if (result) {
        this.autoCompleteInput(result)
      } else {
        var input = document.getElementsByClassName('autocomplete-input')[0]
        if (input) {
          this.autoCompleteInput(input.value)
        }
      }

      this.$nextTick(this.autoCompleteHooks)
    },
    isEmojis(msgText) {
      const regex = /<% RGI_Emoji %>|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}/gu
      const variationSelector = /[\u180B-\u180D\uFE00-\uFE0F]|\uDB40[\uDD00-\uDDEF]/gu

      msgText = msgText.replace(/\u{fffc}/gu, "")

      return msgText.replace(' ', '').replace(regex, '').replace(variationSelector, '').length == 0 
             && msgText.replace(' ', '').replace(variationSelector, '').length <= 8
             && msgText.replace(' ', '').length != 0
    },
    humanReadableDay (date) {
      let ts = date
      let today = new Date()
      let tsDate = new Date(ts).setHours(0,0,0,0)
      
      if (new Date().setHours(0,0,0,0) == tsDate) {
        return 'Today'
      } else if (tsDate >= new Date().setHours(0,0,0,0) - 86400000) {
        return 'Yesterday'
      } else {
        let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).setHours(0,0,0,0)
        if (ts >= lastWeek) {
          return moment(ts).format('dddd')
        }
      }

      let lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).setHours(0,0,0,0)
      if (ts < lastYear) {
        return moment(ts).format('ll') + ','
      }

      return moment(ts).format('ddd, MMM D') + ','
    },
    humanReadableTimestamp (date) {
      let ts = date
      let tsDate = new Date(ts).setHours(0,0,0,0)

      if (new Date().setHours(0,0,0,0) == tsDate) {
        return moment(ts).format('LT')
      } else if (tsDate >= new Date().setHours(0,0,0,0) - 86400000) {
        return 'Yesterday'
      } else {
        let today = new Date()
        let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).setHours(0,0,0,0)
        if (ts >= lastWeek) {
          return moment(ts).format('dddd')
        }
      }

      return moment(ts).format("M/D/YY")
    },
    fetchMessages () {
      if (this.offset == 0 && this.$store.state.messagesCache[this.$route.params.id]) {
        this.messages = this.$store.state.messagesCache[this.$route.params.id].map(o => ({...o}))
        this.postLoad()
        return
      }
      
      if (this.$socket && this.$socket.readyState == 1) {
        if (this.loading) return
        this.loading = true

        this.sendSocket({ action: 'fetchMessages', data: {
            id: this.$route.params.id,
            offset: `${this.offset}`,
            limit: `${this.limit}`
          }
        })
      } else {
        setTimeout(this.fetchMessages, 1000)
      }
    },
    reloadMessage(guid) {
      this.sendSocket({ action: 'getMessageByGUID', data: {
          guid: guid,
        }
      })
    },
    autoResize (value) {
      if (value !== false) {
        this.$set(this.messageText, this.$route.params.id, value)
        this.sendTypingIndicator(value)
      }

      var el = document.getElementById('twemoji-textarea')
      this.$nextTick(() => {
        let scrollHeight = el.scrollHeight
        el.style.setProperty('height', '22px', 'important')
        if (el.scrollHeight > 22) {
          scrollHeight = el.scrollHeight
          el.style.setProperty('height', 'auto', 'important')
        }
      })
    },
    sendTypingIndicator(value) {
      if (this.lastTypingValue == value) return
      this.lastTypingValue = value

      if (value != '') {
        this.sendSocket({ action: 'setIsLocallyTyping', data: {
          chatId: this.messages[0].chatId,
          typing: true
        }})
      } else {
        this.sendSocket({ action: 'setIsLocallyTyping', data: {
          chatId: this.messages[0].chatId,
          typing: false
        }})
      }
    },
    openReactionMenu (msgId, textId, guid, reactions, part, balloon) {
      let el = $('#msg'+msgId+'-text'+textId+'-part'+part)
      this.reactingMessageReactions = reactions
      this.reactingMessageGUID = guid
      this.reactingMessagePart = part
      this.reactingMessage = el
      this.reactingToBalloon = balloon
    },
    sendReaction (reactionId, guid, part) {
      if (!this.messages[0]) return
      this.sendSocket({ action: 'sendReaction', data: {
        chatId: this.messages[0].chatId,
        guid: guid,
        reactionId: reactionId,
        part: part
      }})
    },
    sendText () {
      if (!this.canSend) return

      let messageText = this.messageText[this.$route.params.id] ? this.messageText[this.$route.params.id] : ''
      let subjectText = this.$refs.subjectLine ? this.$refs.subjectLine.value : ''

      if (messageText == '' && subjectText != '') {
        messageText = subjectText
        subjectText = ''
      }

      if (messageText == '' && (!this.$refs.uploadButton.attachments || this.$refs.uploadButton.attachments.length == 0)) return
      this.canSend = false

      let textObj = {
        text: messageText,
        attachments: this.$refs.uploadButton.attachments,
        address: this.messages[0] ? this.messages[0].chatId : this.receiver,
        subject: subjectText
      }
      
      this.messageText[this.$route.params.id] = ""

      axios.post(this.$store.getters.httpURI+'/sendText', textObj)
        .then(response => {
          let focusedEl = $(document.activeElement).attr('id')
          if (this.$refs.uploadButton) {
            this.$refs.uploadButton.clear()
          }
          this.$nextTick(() => $('#'+focusedEl).focus())

          this.canSend = true
          this.autoResize(false)
          this.subjectInput = ''
          document.getElementById("twemoji-textarea").innerHTML = ""
        })
        .catch(error => {
          alert("There was an error while sending your text.\n" + error)
          this.canSend = true
          this.autoResize(false)
          this.subjectInput = ''
          document.getElementById("twemoji-textarea").innerHTML = ""
        })
    },
    scrollToBottom () {
      if (this.$refs.messages) {
        let container = this.$refs.messages.SimpleBar.getScrollElement()
        let scrollTo = this.lastHeight ? (container.scrollHeight - this.lastHeight) : container.scrollHeight

        container.scrollTop = scrollTo

        $(document).off('click', '.message a[href^="http"]')
        $(document).on('click', '.message a[href^="http"]', function(event) {
          event.preventDefault()
          shell.openExternal(this.href)
        })
      }
    },
    attachmentLoaded() {
      this.ignoreNextScroll = true
      this.scrollToBottom()
    },
    autoCompleteHooks () {
      if (this.$route.params.id == 'new') {
        this.$nextTick(() => {
          var input = document.getElementsByClassName('autocomplete-input')[0]
          if (input) {
            input.focus()
            input.addEventListener('input', (e) => {
              this.receiver = ''
            })
          }
        })
      }
    },
    autoCompleteInput (input) {
      if (input && input.name) {
        this.receiver = input.phone
        this.hookPasteAndDrop()
      } else if (/^\+\d{11,16}/gi.test(input)) {
        this.receiver = input
        this.hookPasteAndDrop()
      } else if (/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(input)) {
        this.receiver = input
        this.hookPasteAndDrop()
      }
    },
    previewFiles () {
      this.hasAttachments = this.$refs.uploadButton && this.$refs.uploadButton.attachments != null && this.$refs.uploadButton.attachments.length > 0
      this.autoResize(false)
    },
    removeAttachment (i) {
      if (!this.canSend) return
      this.$refs.uploadButton.remove(i)
    },
    postLoad () {
      if (this.offset == 0) {
        this.$nextTick(() => {
          if (this.$refs.messages) {
            let container = this.$refs.messages.SimpleBar.getScrollElement()
            container.addEventListener('scroll', (e) => {
              if (this.ignoreNextScroll && this.lastHeight == null) {
                this.ignoreNextScroll = false
                return
              }

              if (container.scrollHeight - (container.scrollTop + container.offsetHeight) <= 10) {
                this.lastHeight = null
                this.$emit('markAsRead', this.$route.params.id)
              }
              else this.lastHeight = container.scrollHeight - container.scrollTop

              if (container.scrollTop == 0 && !this.loading) {
                this.fetchMessages()
              }
            })
          }
        })

        this.$emit('markAsRead', this.$route.params.id)
      }

      this.ignoreNextScroll = true
      this.$nextTick(this.scrollToBottom)
      let el = document.getElementById('twemoji-textarea')
      if (el) el.focus()

      this.offset += this.limit
      this.loading = false

      this.hookPasteAndDrop()
    },
    hookPasteAndDrop () {
      this.$nextTick(() => {
        var el = document.getElementById('twemoji-textarea')
        if (el) {
          setTimeout(() => { el.focus() }, 10)
          el.addEventListener('paste', e => {
            if (e.clipboardData.files && e.clipboardData.files.length > 0) {
              let text = e.clipboardData.getData('Text')
              let files = e.clipboardData.files
              this.handleFiles(files, text, e.target)
            }
          })
          el.addEventListener('drop', e => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              let files = e.dataTransfer.files
              this.handleFiles(files)
            }
          })
        }
      })
    },
    handleFiles (files, text, target) {
      if (text && text.length > 0) {
        this.$nextTick(() => {
          let newText = target.innerHTML.slice(0, window.getSelection().anchorOffset-text.length) + target.innerHTML.slice(window.getSelection().anchorOffset)
          target.innerHTML = newText
          if (newText.length > 0) {
            let sel = window.getSelection()
            sel.collapse(target.lastChild, newText.length)
          }
          this.autoResize(newText)
        })
      }

      this.$refs.uploadButton.$refs.fileInput.files = files
      this.$refs.uploadButton.filesChanged()
    }
  },
  mounted () {
    this.$nextTick(this.autoCompleteHooks)
    this.fetchMessages()

    ipcRenderer.on('reactToMessage', (e, args) => {
      this.openReactionMenu(args.id, args.ii, args.guid, args.reactions, args.part, args.balloon)
    })
  },
  socket: {
    fetchMessages (data) {
      if (this.$route.params.id == 'new') return
      if (data && data[0] && (data[0].personId != this.$route.params.id)) return

      if (this.offset == 0 && !this.$store.state.messagesCache[this.$route.params.id]) {
        this.messages = data
      }
      else this.messages.push(...data)

      this.postLoad()
    },
    setAsRead (data) {
      if (this.$route.params.id == 'new' || !data) return
      if (this.$route.params.id == data.chatId) {
        let messageIndex = this.messages.findIndex(obj => obj.guid == data.guid)
        if (messageIndex > -1) {
          this.messages[messageIndex]['dateRead'] = data.read
          this.messages[messageIndex]['dateDelivered'] = data.delivered
          this.$set(this.messages, messageIndex, this.messages[messageIndex]) // Reactivity in Vue is weird
          
          if (this.lastHeight == null) {
            this.ignoreNextScroll = true
            this.$nextTick(this.scrollToBottom)
          }
        }
      }
    },
    setTypingIndicator (data) {
      if (data && data.chat_id == this.$route.params.id && this.lastHeight == null) {
        this.ignoreNextScroll = true
        this.$nextTick(this.scrollToBottom)
      }
    },
    newMessage (data) {
      var message = data.message

      if (this.$route.params.id == 'new') {
        if (Object.keys(message).length > 0) {
          if (message[0].chatId == this.receiver) {
            this.$router.push('/message/'+message[0].personId)
          }
        }
        return
      }

      if (Object.keys(message).length == 0) {
        console.log("Received a message, but content was empty.")
      } else {
        if (this.messages && this.messages.length > 0 && message[0]['personId'] == this.$route.params.id) {
          let oldMsgIndex = this.messages.findIndex(obj => obj.guid == message[0].guid)
          if (oldMsgIndex != -1) {
            this.messages[oldMsgIndex] = message[0]
            this.$set(this.messages, oldMsgIndex, message[0]) 
            return
          }

          if (message[0].sender != 1) this.$store.commit('setTyping', { chatId: this.$route.params.id, isTyping: false })
          this.messages.unshift(message[0])

          if (this.lastHeight == null) {
            // this.ignoreNextScroll = true
            this.$nextTick(this.scrollToBottom)
          }

          if (this.lastHeight == null) {
            this.$emit('markAsRead', this.$route.params.id)
          }
        }
      }
    },
    newReaction (data) {
      let reactions = data.reactions
      if (reactions && reactions.length > 0) {
        let msgIndex = this.messages.findIndex(obj => obj.guid == reactions[0].forGUID)
        if (msgIndex > -1) {
          this.messages[msgIndex].reactions = reactions
          this.$set(this.messages[msgIndex], 'reactions', reactions)
          
          let intervalTime = 0
          this.$nextTick(() => {
            if (this.lastHeight == null) {
              let interval = setInterval(() => {
                if (this.lastHeight == null) this.scrollToBottom()
                if (intervalTime >= 200) clearInterval(interval)
                intervalTime += 1
              }, 1)
            }
          })
        }
      }
    },
    onerror () {
      this.loading = false
      this.messages = []
    },
    onclose () {
      this.loading = false
      this.messages = []
    },
    onopen () {
      this.loading = false
      this.offset = 0
      this.fetchMessages()
    }
  }
}
</script>

<style lang="scss">
.attachmentPreview {
  border: 1px solid #545454;
  margin-left: 32px;
  margin-right: 58px;
  margin-bottom: -1px;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  padding: 5px;
  padding-top: 0px;

  .attachment {
    border-radius: 10px;
    padding: 6px 10px;
    color: lighten(#c2c2c2, 20%);
    background-color: #3A3A3C;
    position: relative;
    overflow-wrap: break-word;
    display: inline-block;
    max-width: 120px;
    margin-right: 5px;
    margin-top: 5px;

    .removeAttachment {
      position: absolute;
      right: -4px;
      top: -4px;
    }
  }
}

.autocomplete-result {
  padding: 12px 12px 12px 28px;
  background-image: url('../assets/search.svg');
  background-position: 6px center;
  background-size: 14px;
}

.autocomplete-result:hover,
.autocomplete-result[aria-selected="true"] {
  background-color: rgba(0, 0, 0, 0.2) !important;
}

.autocomplete-result-list {
  border: 1px solid rgba(0,0,0,.5) !important;
  border-top-color: transparent !important;
  background: rgb(50,50,50) !important;
  overflow: hidden;
  border-radius: 0 !important;
  padding: 0 !important;
}

.autocomplete[data-loading=true]:after {
  width: 10px !important;
  height: 10px !important;
}

.autocomplete-input {
  margin: 0 !important;
  background: transparent !important;
  border: none !important;
  color: inherit !important;
  height: inherit !important;
  padding: 0 !important;
  font-weight: inherit !important;
  font-size: 14px !important;
  font-family: inherit !important;
  letter-spacing: 0.1px !important;
  margin-top: -2px !important;

  &:focus {
    -webkit-box-shadow: none !important;
    -moz-box-shadow: none !important;
    box-shadow: none !important;
  }
}

.msgTextboxWrapper {
  .subjectLine {
    border:none;
    background-image: none;
    background-color: transparent;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    box-shadow: none;
    outline: none;

    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
    margin-left: 32px;
    width: calc(100% - 112px);
    background: #1d1d1d !important;
    border: 1px solid #545454 !important;
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
    margin-bottom: -1px;
    color: white;
    padding-left: 10px;
    padding-right: 10px;
    line-height: 20px;
    font-weight: 500;
    letter-spacing: 0.25px;

    &::placeholder {
      color: lighten(#7E7E7E, 25%);
    }

    &.noTopBorder {
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }
  }
}

#twemoji-textarea-outer {
  background-color: transparent !important;
  width: calc(100% - 52px);
  float: left;

  #twemoji-textarea {
    overflow: auto;
    outline: none;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    box-shadow: none;
    resize: none;
    padding: 0 !important;
    margin: 0 !important;

    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
    font-weight: 300 !important;
    min-height: 22px !important;
    max-height: 100px !important;
    height: 22px !important;
    flex-grow: 90;
    border-radius: 14px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
    background: rgba(29,29,29, 1) !important;
    border: 1px solid #545454 !important;
    line-height: 22px !important;
    font-size: 13px !important;
    margin-left: 6px !important;
    margin-right: 6px !important;
    overflow-x: hidden;

    .emoji {
      width: 15px !important;
      height: 15px !important;
      vertical-align: 0 !important;
    }
  }

  &.noTopBorder {
    #twemoji-textarea {
      border-top-right-radius: 0px !important;
      border-top-left-radius: 0px !important;
    }
  }

  #emoji-popup {
    width: calc(100% - 7px) !important;
    border: none !important;

    .emoji-popover-inner {
      width: auto !important;
      height: 170px !important;
      background: none !important;
    }
  }
}

#popper-container {
  position: fixed !important;
  bottom: 0px !important; left: -6px !important;
  z-index: 1 !important;
  border: 1px solid #555555 !important;
  width: 310px !important;
  height: 250px !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  box-sizing: border-box !important;
  border-radius: 0.5rem !important;
  background-color: rgba(40,40,40, 0.7) !important;
  backdrop-filter: blur(4px) !important;

  .emoji {
    width: 16px !important;
    height: 16px !important;
    top: 0.2em !important;
  }

  #arrow {
    bottom: -14px !important;
    left: 8px !important;
    height: 14px !important;
    width: 20px !important;
    padding: 0 !important;
    overflow: hidden;
    transform: rotate(180deg) !important;
    // top:
    &:before {
      height: 100% !important;
      width: calc(100% - 6px) !important;
      margin-top: 7px !important;
      margin-left: 2px !important;
      background: rgba(40,40,40, 0.8) !important;//rgba(40,40,40, 0.8) !important;
      border: 1px solid #555555;
    }
  }

  #emoji-container {
    #emoji-popover-search {
      background-color: rgb(50,50,50) !important;
      margin: 0 !important;

      #search-header {
        border: none !important;
        border-radius: 6px !important;

        &.is-focused {
          background-color: rgb(75,75,75) !important;
        }

        input {
          padding: 5px 5px !important;
          color: white;
          font-size: 14px !important;
        }
      }
    }

    #emoji-popover-header {
      padding: 5px !important;
      padding-top: 0px !important;
      padding-bottom: 15px !important;
      border-bottom: 1px solid lighten(#555, 30%) !important;
    }

    .emoji-tab.active, .emoji-tab:hover {
      padding-bottom: 12px !important;
      border-bottom: 2px solid lighten(#555, 10%) !important;
    }

    .emoji-tab {
      max-height: 26px !important;
      padding: 0px 5px !important;
      border-radius: 0px !important;
      margin-top: 0px !important;
    }

    .emoji-list {
      padding-top: 6px !important;

      span {
        width: 20px !important;
        padding-bottom: 6px !important;

        &:hover {
          background: lighten(#555, 10%) !important;
        }
      }
    }
  }
}

.textboxContainer #emoji-container > #emoji-popup #emoji-popover-search > #search-header > span {
  width: 2px !important;
  padding: 0px 10px;
  margin-top: -2px;
}

.emoji-picker__search {
  display: flex;
}

.emoji-picker h5 {
  margin-bottom: 0;
  color: #b1b1b1;
  text-transform: uppercase;
  font-size: 0.8rem;
  cursor: default;
}

.emoji-picker .emojis {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.emoji-picker .emojis:after {
  content: "";
  flex: auto;
}

.emoji-picker .emojis span {
  padding: 0.2rem;
  cursor: pointer;
  border-radius: 5px;
}

.emoji-picker .emojis span:hover {
  background: #ececec;
  cursor: pointer;
}

.emoji-picker__search {
  width: 100%;
}

.textboxContainer {
  //position: absolute;
  bottom: 0;
  padding: 10px;
  padding-bottom: 4px;
  width: calc(100% - 20px);
  margin-right: 0px;

  .feather {
    &:hover {
      filter: brightness(115%);
    }
    cursor: pointer;
  }

  .sendBtn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #1287FF;
    margin-left: -20px;
    float: right;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    margin-right: 4px;

    &.SMS {
      background: #35CC5B;
    }

    svg {
      stroke: rgb(255,255,255);
      cursor: initial;
    }

    &.cantSend {
      filter: brightness(40%);
      cursor: initial;
    }

    &:not(.cantSend) {
      .feather {
        cursor: pointer;
      }
      &:hover {
        filter: brightness(115%);
      }
    }
  }
}

.receiverContainer {
  font-size: 14px;
  padding: 10px 20px;

  .label {
    font-weight: 500;
    color: #7F7F7F;
    float: left;
    -webkit-app-region: no-drag;
  }

  .contact {
    padding-left: 4px;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: calc(100% - 30px);
    // width: max-content;
    -webkit-app-region: no-drag;
  }
}

.messageContainer {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  text-align: left;
  justify-content: space-between;
  flex-direction: column;

  .titlebar {
    height: 39px;
    max-height: 39px;
    min-height: 39px;
    background-color: #373737;
    border-bottom: 2px solid #1d1d1d;

    .closeBtn {
      position: absolute;
      top: 16px;
      right: 8px;
      -webkit-app-region: no-drag;

      .feather {
        cursor: pointer;

        &:hover {
          filter: brightness(80%);
        }
      }
    }
  }
}

.messages {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column-reverse;
  padding: 5px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 0;

  .timegroup {
    text-align: center;
    // padding-top: 10px;
    padding-bottom: 10px;
    color: #999999;
    font-size: 11px;

    .bold {
      font-weight: 500;
    }
  }

  .simplebar-vertical {
    margin-right: 6px;
  }

  .simplebar-scrollbar:before {
    background: #575757;
  }

  .senderName {
    color: #999999;
    font-size: 0.85em;
    margin-left: 54px;
  }
}

.messageGroup {
  margin-bottom: 10px;
  padding-left: 20px;
  padding-right: 20px;
  display: flex;
  flex-direction: row;

  .groupWrapper {
    // display: flex;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
  }

  .authorAvatar {
    z-index: 2;
    margin-left: -10px;
    margin-top: 0px;
    margin-right: 8px;
    display: inline-flex;
    align-self: flex-end;
  }

  &.last {
    margin-bottom: 0px;
  }

  .attachment {
    // max-width: 75%;
    // max-height: 60vh;
    width: max-content;
    max-width: 100%;
    height: auto;
    border-radius: 18px;
    padding-bottom: 1px;
    display: block;
    // margin-bottom: -2px;

    img {
      // max-width: 280px;
      // max-height: 700px;
      border-radius: 18px;
      border-radius: 12px;
      max-height: 33vh;
      max-width: 100%;
      width: auto;
      height: auto;
      display: block;
    }

    video {
      // max-width: 420px;
      // max-height: 700px;
      border-radius: 12px;
      max-height: 33vh;
      max-width: 100%;
      width: auto;
      height: auto;
      display: block;
    }
  }
}

.message {
  border-radius: 14px;
  padding: 6px 10px;
  margin-top: 0px;
  margin-bottom: 0px;
  max-width: 100%;
  text-align: start;
  unicode-bidi: plaintext;

  &.payload {
    padding: 0;
  }

  .subject {
    white-space: pre-wrap;
    font-weight: 500;
    letter-spacing: 0.25px;
  }
}

.bubbleWrapper {
  max-width: 100%;
}

.send.iMessage {
  .message {
    background-color: #1287FF !important;
    &:before {
      background: #1287FF !important;
    }

    &.payload {
      background-color: #3A3A3C !important;
      &:before {
        background: #3A3A3C !important;
      }
    }
  }
}

.receive {
  align-items: flex-start;

  .textWrapper {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    margin-right: 25%;
    max-width: 75%;
    margin-bottom: 1px;
  }

  .message {
    color: white;
    // margin-right: 25%;
    background-color: #3A3A3C;
    position: relative;
    overflow-wrap: break-word;

    a {
      color: #2284FF;
    }

    &.last {
      &:before {
        content: "";
        position: absolute;
        z-index: 0;
        bottom: 0;
        left: -10px;
        height: 16px;
        width: 20px;
        background: #3A3A3C;
        border-bottom-right-radius: 12px;
      }

      &:after {
        content: "";
        position: absolute;
        z-index: 1;
        bottom: 0;
        left: -10px;
        width: 10px;
        height: 20px;
        background: #1D1D1D;
        border-bottom-right-radius: 8px;
      }
    }

    &.jumbo {
      padding-left: 0;
      background: transparent;
      .emoji {
        width: 38px;
        padding: 0px 2px;
      }
      &:before, &:after {
        background: transparent;
      }
    }
  }
}

.send {
  align-items: flex-end;
  justify-content: flex-end;

  .textWrapper {
    display: flex;
    align-items: flex-end;
    flex-direction: column;
    margin-left: 25%;
    max-width: 75%;
    margin-bottom: 1px;
  }

  .message {
    color: white;
    background: #35CC5B;
    position: relative;
    // margin-left: 25%;
    overflow-wrap: break-word;

    a {
      color: white;
    }

    &.last {
      &:before {
        content: "";
        position: absolute;
        z-index: 0;
        bottom: 0;
        right: -10px;
        height: 16px;
        width: 20px;
        background: #35CC5B;
        border-bottom-left-radius: 12px;
      }

      &:after {
        content: "";
        position: absolute;
        z-index: 1;
        bottom: 0;
        right: -10px;
        width: 10px;
        height: 20px;
        background: #1D1D1D;
        border-bottom-left-radius: 8px;
      }
    }

    &.jumbo {
      padding-right: 0;
      background: transparent !important;
      .emoji {
        width: 38px;
        padding: 0px 2px;
      }
      &:before, &:after {
        background: transparent !important;
      }
    }
  }

  .receipt {
    margin-top: 4px;
    margin-bottom: 4px;
    margin-right: -2px;
    color: #999999;
    font-size: 11px;

    .type {
      font-weight: 500;
    }
  }
}
</style>
