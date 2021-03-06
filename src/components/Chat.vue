<template>
  <confirm-dialog ref="deleteConfirmation" class="confirmDialog"></confirm-dialog>
  <div class="chatContainer" :class="$route.path == '/chat/' + chatid ? 'active' : ''" :id="'id' + chatid" @click="navigate">
    <div
      class="chatWrapper"
      @mousedown="dragMouseDown"
      :style="{
        left: '-' + slideX + 'px',
      }"
    >
      <div class="unread" :style="read ? 'background-color: transparent;' : ''"></div>
      <div class="avatarContainer">
        <avatar
          v-if="(docid && docid != 0) || isGroup"
          class="avatar"
          :username="author"
          :size="40"
          inline
          :src="
            `${$store.getters.httpURI}/contactimg?docid=${encodeURIComponent(isGroup ? chatid : docid)}&auth=${encodeURIComponent(
              $store.state.password
            )}`
          "
        />
        <img v-else class="avatar" src="../assets/profile.jpg" />
      </div>
      <div class="chatContent">
        <div class="title">
          <span class="author">
            <span class="name" v-html="$filters.nativeEmoji(author)"></span>
            <span v-if="showNum" class="number"> ({{ chatid }})</span>
            <feather type="bell-off" stroke="rgb(85,85,85)" size="13" v-if="$store.state.mutedChats.includes(chatid)"></feather>
          </span>
          <span class="date">{{ momentDate }}</span>
        </div>
        <typing-indicator v-if="$store.state.isTyping[chatid]"></typing-indicator>
        <div class="text" v-else>
          <span v-html="trimmedText"></span>
        </div>
      </div>
    </div>
    <div
      class="slidableDiv"
      :style="{
        left: 'calc(100% - ' + slideX + 'px)',
      }"
    >
      <div class="hideAlerts" @click="hideAlerts">
        {{ $store.state.mutedChats.includes(chatid) ? 'Unhide Alerts' : 'Hide Alerts' }}
      </div>
      <div class="deleteChat" @click="deleteChat">
        Delete
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import TypingIndicator from '@/components/TypingIndicator.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Avatar from '@/components/Avatar'
import sendSocketMixin from '@/mixin/socket'

export default {
  components: {
    TypingIndicator,
    Avatar,
    ConfirmDialog,
  },
  name: 'Chat',
  props: {
    chatid: {
      type: String,
    },
    docid: {
      type: Number,
    },
    author: {
      type: String,
    },
    text: {
      type: String,
    },
    date: {
      type: Number,
    },
    read: {
      type: Boolean,
    },
    showNum: {
      type: Boolean,
    },
    isGroup: {
      type: Boolean,
    },
  },
  mixins: [sendSocketMixin],
  data() {
    return {
      initialX: 0,
      slideX: 0,
      closingSlider: false,
      sliderWidth: 120,
    }
  },
  emits: ['navigated', 'deleted'],
  computed: {
    trimmedText() {
      const text = this.$filters.nativeEmoji(this.text)
      if (text == '' && this.text.includes('￼')) {
        //This looks empty, but there is a unicode character in there (U+FFFC)
        return '<i>Attachment</i>'
      }
      return text
    },
    momentDate() {
      return this.moment(this.date / 1000)
    },
  },
  methods: {
    navigate() {
      this.$emit('navigated')

      if (this.$route.path != '/chat/' + this.chatid) {
        this.$router.push('/chat/' + this.chatid)
      }
    },
    moment(date) {
      const ts = date * 1000
      const tsDate = new Date(ts).setHours(0, 0, 0, 0)

      if (new Date().setHours(0, 0, 0, 0) == tsDate) {
        return moment(ts).format('LT')
      } else if (tsDate >= new Date().setHours(0, 0, 0, 0) - 86400000) {
        return 'Yesterday'
      } else {
        const today = new Date()
        const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).setHours(0, 0, 0, 0)
        if (ts >= lastWeek) {
          return moment(ts).format('dddd')
        }
      }

      return moment(ts).format('M/D/YY')
    },
    dragMouseDown(e) {
      e.preventDefault()
      if (this.closingSlider) return
      this.initialX = e.clientX
      if (this.slideX > 0) {
        this.closeDragElement()
      }

      document.onmousemove = this.elementDrag
      document.onmouseup = this.finishDragElement
    },
    elementDrag(e) {
      e.preventDefault()
      if (this.closingSlider) return
      if (this.initialX - e.clientX < 0 || this.initialX - e.clientX > this.sliderWidth) return
      this.slideX = this.initialX - e.clientX
    },
    closeDragElement() {
      this.closingSlider = true
      const interval = setInterval(() => {
        if (this.slideX <= 0) {
          this.closingSlider = false
          this.slideX = 0
          this.initialX = 0
          clearInterval(interval)
          return
        }

        this.slideX -= 3
      }, 6)

      document.onmouseup = null
      document.onmousemove = null
    },
    finishDragElement() {
      if (this.closingSlider) return
      if (this.slideX >= this.sliderWidth / 2.2) {
        const interval = setInterval(() => {
          if (this.closingSlider) return
          if (this.slideX >= this.sliderWidth) {
            this.slideX = this.sliderWidth
            clearInterval(interval)
            return
          }

          this.slideX += 3
        }, 6)
      } else {
        this.closeDragElement()
      }

      document.onmouseup = null
      document.onmousemove = null
    },
    deleteChat() {
      this.closeDragElement()

      this.$refs.deleteConfirmation.open({
        title: 'Warning',
        message: `Are you sure you want to delete your messages from ${this.author}? This cannot be undone.`,
        button: {
          no: 'No',
          yes: 'Yes',
        },
        callback: confirm => {
          if (confirm) {
            this.sendSocket({
              action: 'deleteChat',
              data: {
                chatId: `${this.chatid}`,
              },
            })
            this.$emit('deleted')
          }
        },
      })
    },
    hideAlerts() {
      this.closeDragElement()
      this.$store.commit(this.$store.state.mutedChats.includes(this.chatid) ? 'unmuteChat' : 'muteChat', this.chatid)
    },
  },
}
</script>

<style lang="scss">
.unread {
  background-color: #0a84ff;
  width: 9px;
  height: 9px;
  border-radius: 10px;
  float: left;
  margin-left: 2px;
  margin-top: 26px;
}

.chatContent {
  float: right;
  // padding: 0px;
  text-align: left;
  height: calc(100% - 1px);
  width: calc(100% - 65px);
  border-bottom: 1px solid rgba(87, 87, 87, 0.7);
  font-size: 13px;
  position: relative;
}

.text {
  color: rgb(157, 157, 157);
  width: calc(100% - 12px);
  margin-top: -3px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-align: start;
  unicode-bidi: plaintext;
}

.title {
  padding-top: 6px;
}

.author {
  font-weight: 500;
  max-width: 156px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .number {
    font-weight: 200;
    font-size: 11px;
  }

  i {
    padding-left: 4px;
    vertical-align: middle;
  }
}

.date {
  font-weight: 300;
  padding-right: 10px;
  float: right;
  color: rgb(157, 157, 157);
}

.avatarContainer {
  float: left;
  width: 57px;
  padding-left: 0;
  margin-left: -4px;
  padding-top: 11px;

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
}

.chatContainer {
  width: 300px;
  height: 64px;
  border-radius: 5px;
  position: relative;
  overflow: hidden;

  &.active {
    background-color: #2284ff;

    .chatContent {
      border: none;

      .text {
        color: #a9d5ff;
      }

      .date {
        color: #a9d5ff;
      }
    }
  }

  .chatWrapper {
    height: inherit;
    position: absolute;
    width: inherit;
  }

  .slidableDiv {
    position: absolute;
    left: 100%;
    display: flex;
    width: 120px;
    height: 100%;

    div {
      display: flex;
      flex: 1 1 0px;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 400;
      cursor: pointer;

      &:hover {
        filter: brightness(85%);
      }
    }

    .deleteChat {
      background: #ff3b2f;
    }

    .hideAlerts {
      background: #5959d1;
    }
  }
}
</style>
