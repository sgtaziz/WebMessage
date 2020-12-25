<template>
  <div class="messageContainer">
    <div class="titlebar">
      <div class="receiverContainer">
        <span class="label">To:</span>
        <span class="contact" v-if="messages[0] && $route.params.id != 'new'" v-html="$options.filters.twemoji(messages[0].name)"></span>
        <span class="contact" v-else-if="$route.params.id == 'new'" style="overflow: visible;">
          <autocomplete :search="search" :get-result-value="getResultValue" @submit="onSubmit"></autocomplete>
        </span>
      </div>
    </div>

    <div v-if="(!messages || messages.length == 0) && $route.params.id != 'new'" style="height:100%;padding:14px;">
      <img src="@/assets/loading.webp" style="height:18px;" />
    </div>
    <template v-else-if="$route.params.id != 'new' || this.receiver != ''">
      <simplebar class="messages" ref="messages" data-simplebar-auto-hide="false">
        <template v-for="(msg, i) in sortedMessages" :id="msg.id">
          <div class="timegroup" v-html="dateGroup(i-1, i)"></div>

          <div :ref="'msg'+msg.id" :class="(msg.sender == 1 ? 'send ' : 'receive ') + msg.type" class="messageGroup">
            <div v-if="msg.group && msg.sender != 1" class="senderName" v-html="$options.filters.twemoji(msg.author)"></div>
            <template v-for="(text, i) in msg.texts">
              <div v-if="msg.attachments && msg.attachments.length > 0" v-for="(attachment, index) in msg.attachments" :key="`${i}-${index}`" class="attachment">
                <img v-if="isImage(attachment[1])"
                :src="`${$store.getters.httpURI}/attachments?path=${encodeURIComponent(attachment[0])}&type=${attachment[1]}&auth=${$store.state.password}`"
                @load="scrollToBottom" />

                <video v-else-if="isVideo(attachment[1])" controls width="100%" @loadeddata="scrollToBottom">
                  <source :src="`${$store.getters.httpURI}/attachments?path=${encodeURIComponent(attachment[0])}&type=${attachment[1]}&auth=${$store.state.password}`"
                    :type="attachment[1].includes('quicktime') ? 'video/mp4' : attachment[1]">
                    This video type is not supported.
                </video>
              </div>
              <div
              class="message"
              :key="i"
              :class="(msg.texts.length-1 == i ? 'last ' : '') + (isEmojis(text.text) ? 'jumbo' : '')"
              v-if="$options.filters.twemoji(text.text) != ''">
                <span style="white-space: pre-wrap;" v-html="$options.filters.twemoji(text.text)"></span>
              </div>
            </template>
          </div>
        </template>
      </simplebar>

      <div class="textboxContainer">
        <twemoji-textarea @contentChanged="autoResize" placeholder="Send a message..."
          :emojiData="emojiDataAll"
          :emojiGroups="emojiGroups"
          :initialContent="messageText[$route.params.id]"
          @enterKey="sendText(messageText[$route.params.id])">
          <template v-slot:twemoji-picker-button>
            <feather type="smile" fill="rgb(152,152,152)" stroke="rgb(29,29,29)" size="26"></feather>
          </template>
        </twemoji-textarea>
      </div>
    </template>
  </div>
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

export default {
  name: 'Message',
  components: {
    simplebar,
    'twemoji-textarea': TwemojiTextarea,
    Autocomplete
  },
  data: function () {
    return {
      messages: [],
      messageText: [],
      limit: 25,
      offset: 0,
      receiver: '',
      lastHeight: null,
      ignoreNextScroll: false,
      loading: false
    }
  },
  computed: {
    emojiDataAll() {
      let data = EmojiAllData.filter((obj) => {
        return obj.group != 2
      })
      return data
    },
    emojiGroups() {
      let groups = EmojiGroups.filter((obj) => {
        return obj.description != '🦲'
      })
      return groups
    },
    sortedMessages() {
      let messages = this.messages

      const groupDates = (date1, date2) => (date2 - date1 < 6000)
      const groupAuthor = (author1, author2) => (author1 == author2)

      const groupedMessages = messages.reduce((r, { text, ...rest }, i, arr) => {
        const prev = arr[i +-1];

        if (prev && groupAuthor(rest.author, prev.author) && groupAuthor(rest.sender, prev.sender) && groupDates(rest.date, prev.date))
            r[r.length - 1].texts.unshift({ text: text.trim(), date: rest.date, attachments: rest.attachments })
        else
          r.push({ ...rest, texts: [{ text: text.trim(), date: rest.date, attachments: rest.attachments }] })

        return r;
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
    dateGroup(prev, current) {
      let prevstamp = this.sortedMessages[prev] ? this.sortedMessages[prev].date : 0
      let currstamp = this.sortedMessages[current].date
      let today = new Date().setHours(0,0,0,0)

      if (prev == -1 || currstamp - prevstamp > 6000) {
        let humanReadableStamp = this.humanReadableDay(currstamp)
        return `<span class="bold">${humanReadableStamp}</span> ${moment(currstamp*1000).format('LT')}`
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
      if (result && result.chatId) {
        this.$router.push('/message/'+result.chatId)
      } else if (result) {
        this.autoCompleteInput(result)
      } else {
        var input = document.getElementsByClassName('autocomplete-input')[0]
        if (input) {
          this.autoCompleteInput(input.value)
        }
      }
    },
    isEmojis(msgText) {
      const regex = /<% RGI_Emoji %>|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}/gu

      return msgText.replace(' ', '').replace(regex, '').length == 0 && msgText.replace(' ', '').length <= 8
    },
    humanReadableDay (date) {
      let ts = date*1000
      let tsDate = new Date(ts).setHours(0,0,0,0)

      if (new Date().setHours(0,0,0,0) == tsDate) {
        return 'Today'
      } else if (tsDate >= new Date().setHours(0,0,0,0) - 86400000) {
        return 'Yesterday'
      } else {
        let today = new Date()
        let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).setHours(0,0,0,0)
        if (ts >= lastWeek) {
          return moment(ts).format('dddd')
        }
      }

      let localDate = moment(ts).format("l")
      let dateParts = localDate.split("/")
      dateParts[2] = dateParts[2].substring(2)
      let formattedDate = dateParts.join("/")
      return formattedDate
    },
    fetchMessages () {
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
        setTimeout(this.fetchMessages, 100)
      }
    },
    autoResize (value) {
      this.messageText[this.$route.params.id] = value
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
    sendText (messageText) {
      messageText = messageText.trim()
      if (this.$socket && this.$socket.readyState == 1) {
        let textObj = {
          text: messageText,
          address: this.messages[0] ? this.messages[0].address : this.receiver
        }

        this.sendSocket({
          action: "sendText",
          data: textObj
        })

        document.getElementById("twemoji-textarea").innerHTML = ""
        this.messageText[this.$route.params.id] = ""
        this.autoResize()
      } else {
        console.log("Socket disconnected, waiting...")
        setTimeout(this.sendText(messageText), 100)
      }
    },
    scrollToBottom () {
      if (this.$refs.messages) {
        let container = this.$refs.messages.SimpleBar.getScrollElement()
        let scrollTo = this.lastHeight ? (container.scrollHeight - this.lastHeight) : container.scrollHeight

        container.scrollTop = scrollTo

        if (document.getElementById('twemoji-textarea') && !this.lastHeight) document.getElementById('twemoji-textarea').focus()
      }
    },
    autoCompleteHooks () {
      if (this.$route.params.id == 'new') {
        var input = document.getElementsByClassName('autocomplete-input')[0]
        if (input) {
          input.focus()
          input.addEventListener('input', (e) => {
            this.receiver = ''
          })
        }
        return
      }
    },
    autoCompleteInput (input) {
      if (input && input.name) {
        this.receiver = input.phone
      } else if (/^\+\d{11,16}/gi.test(input)) {
        this.receiver = input
      }
    }
  },
  mounted () {
    this.autoCompleteHooks()
    this.fetchMessages()
  },
  socket: {
    fetchMessages (data) {
      if (this.$route.params.id == 'new') return

      if (this.offset == 0) this.messages = data
      else this.messages.push(...data)

      if (this.offset == 0) {
        setTimeout(() => {
          if (this.$refs.messages) {
            let container = this.$refs.messages.SimpleBar.getScrollElement()
            container.addEventListener('scroll', (e) => {
              if (this.ignoreNextScroll) {
                this.ignoreNextScroll = false
                return
              }

              if (container.scrollHeight - (container.scrollTop + container.offsetHeight) <= 10) this.lastHeight = null
              else this.lastHeight = container.scrollHeight - container.scrollTop

              if (container.scrollTop == 0 && !this.loading) {
                this.fetchMessages()
              }
            })
          }
        }, 100)
      }

      this.$nextTick(this.scrollToBottom)
      setTimeout(this.scrollToBottom, 10) //Just in case

      this.offset += this.limit
      this.loading = false
    },
    newMessage (data) {
      var message = data.message

      if (this.$route.params.id == 'new') {
        if (Object.keys(message).length > 0) {
          if (message[0].address == this.receiver) {
            this.$router.push('/message/'+message[0].chatId)
          }
        }
        return
      }
      if (Object.keys(message).length == 0) {
        console.log("Received a message, but content was empty.")
      } else {
        if (this.messages && this.messages.length > 0 && message[0]['address'] == this.messages[0]['address']) {
          this.messages.unshift(message[0])
          this.lastHeight = null

          this.$nextTick(this.scrollToBottom)
          setTimeout(this.scrollToBottom, 10) //Just in case
        }
      }
    },
    onerror () {
      this.loading = false
    },
    onclose () {
      this.loading = false
    },
    onopen () {
      this.loading = false
      this.offset = 0
      this.chats = []
      this.fetchMessages()
    }
  }
}
</script>

<style lang="scss">

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

#twemoji-textarea-outer {
  background-color: transparent !important;

  #twemoji-textarea {
    border: none;
    overflow: auto;
    outline: none;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    box-shadow: none;
    resize: none;
    padding: 0 !important;
    margin: 0 !important;

    font-family: -apple-system, "San Francisco", Avenir, Helvetica, Arial, sans-serif;
    letter-spacing: 0.1px !important;
    min-height: 22px !important;
    max-height: 100px !important;
    height: 22px !important;
    width: calc(100% - 45px) !important;
    border-radius: 14px !important;
    padding-left: 10px !important;
    background: rgba(29,29,29, 1) !important;
    border: 1px solid #545454 !important;
    line-height: 21px !important;
    font-size: 13px !important;
    margin-left: 6px !important;
    overflow-x: hidden;

    .emoji {
      width: 15px !important;
      height: 15px !important;
      vertical-align: 0 !important;
    }
  }

  #emoji-popup {
    width: calc(100% - 7px) !important;
    border: none !important;

    .emoji-popover-inner {
      width: auto !important;
      height: 182px !important;
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
    #emoji-popover-header {
      padding: 5px !important;
      padding-bottom: 20px !important;
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
}
.receiverContainer {
  font-size: 14px;
  padding: 10px 20px;

  .label {
    font-weight: 600;
    color: #7F7F7F;
    float: left;
  }

  .contact {
    padding-left: 4px;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: calc(100% - 22px);
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
    padding-bottom: 10px;
    color: #999999;
    font-size: 11px;

    .bold {
      font-family: "San Francisco Bold"
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
    margin-left: 10px;
  }
}

.messageGroup {
  // margin-top: 30px;
  padding-left: 20px;
  padding-right: 20px;
  display: flex;
  flex-direction: column;

  .attachment {
    max-width: 75%;
    margin-bottom: -1px;

    img {
      max-width: 300px;
      max-height: 550px;
      border-radius: 20px;
    }
  }
}

.message {
  border-radius: 18px;
  padding: 6px 10px;
  margin-top: 1px;
  margin-bottom: 0px;
  display: inline-block;
  text-align: start;
  unicode-bidi: plaintext;
}

.send.iMessage {
  .message {
    background-color: #2284FF !important;
    &:before {
      background: #2284FF !important;
    }
  }
}

.receive {
  align-items: flex-start;

  .message {
    color: white;
    margin-right: 25%;
    max-width: 75%;
    background-color: #3A3A3C;
    position: relative;
    overflow-wrap: break-word;

    &.last {
      margin-bottom: 10px;

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

  .message {
    color: white;
    margin-left: 25%;
    background: #35CC5B;
    position: relative;
    max-width: 75%;
    overflow-wrap: break-word;

    &.last {
      margin-bottom: 10px;

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
}

</style>
