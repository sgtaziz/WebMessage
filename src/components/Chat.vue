<template>
  <div class="chatContainer" :class="this.$route.path == '/message/'+this.chatid ? 'active' : ''" :id="'id'+chatid" @click="navigate">
    <div class="chatWrapper" @mousedown="dragMouseDown" :style="{ left: '-'+slideX+'px' }">
      <div class="unread" :style="read ? 'background-color: transparent;' : ''"></div>
      <div class="avatarContainer">
        <img v-if='(docid && docid != 0)' class="avatar" :src="`${$store.getters.httpURI}/contactimg?docid=${encodeURIComponent(docid)}&auth=${encodeURIComponent($store.state.password)}`" />
        <img v-else class="avatar" src="../assets/profile.jpg" />
      </div>
      <div class="chatContent">
        <div class="title">
          <span class="author">
            <span class="name" v-html="$options.filters.twemoji(author)"></span>
            <span v-if="showNum" class="number"> ({{ this.chatid }})</span>
            <feather type="bell-off" stroke="rgb(85,85,85)" size="13" v-if="$store.state.mutedChats.includes(chatid)"></feather>
          </span>
          <span class="date">{{ date/1000 | moment }}</span>
        </div>
        <div class="text">
          <span v-html="trimmedText"></span>
        </div>
      </div>
    </div>
    <div class="slidableDiv" :style="{ left: 'calc(100% - '+slideX+'px)' }">
      <div class="hideAlerts" @click="hideAlerts">{{ $store.state.mutedChats.includes(chatid) ? 'Unhide Alerts' : 'Hide Alerts' }}</div>
      <div class="deleteChat" @click="deleteChat">Delete</div>
    </div>  
  </div>
</template>

<script>
import moment from 'moment'

export default {
  name: 'Chat',
  props: {
    chatid: { type: String },
    docid: { type: Number },
    author: { type: String },
    text: { type: String },
    date: { type: Number },
    read: { type: Boolean },
    showNum: { type: Boolean }
  },
  data () {
    return {
      initialX: 0,
      slideX: 0,
      closingSlider: false,
      sliderWidth: 120,
    }
  },
  computed: {
    trimmedText() {
      let text = this.$options.filters.twemoji(this.text)
      if (text == '' && this.text.includes("￼")) { //This looks empty, but there is a unicode character in there (U+FFFC)
        return "<i>Attachment</i>"
      }
      return text
    }
  },
  filters: {
    moment: function (date) {
      let ts = date*1000
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
    }
  },
  methods: {
    navigate () {
      this.$emit('navigated')

      if (this.$route.path != '/message/'+this.chatid) {
        this.$router.push('/message/'+this.chatid)
      }
    },
    dragMouseDown (e) {
      e.preventDefault()
      if (this.closingSlider) return
      this.initialX = e.clientX
      if (this.slideX > 0) {
        this.closeDragElement()
      }
      
      document.onmousemove = this.elementDrag
      document.onmouseup = this.finishDragElement
    },
    elementDrag (e) {
      e.preventDefault()
      if (this.closingSlider) return
      if (this.initialX - e.clientX < 0 || this.initialX - e.clientX > this.sliderWidth) return
      this.slideX = this.initialX - e.clientX
    },
    closeDragElement () {
      this.closingSlider = true
      let interval = setInterval(() => {
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
    finishDragElement () {
      if (this.closingSlider) return
      if (this.slideX >= (this.sliderWidth/2.2)) {
        let interval = setInterval(() => {
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
    deleteChat () {
      this.closeDragElement()
      this.$confirm({
        title: 'Warning',
        message: `Are you sure you want to delete your messages from ${this.author}? This cannot be undone.`,
        button: {
          no: 'No',
          yes: 'Yes'
        },
        callback: confirm => {
          if (confirm) {
            this.sendSocket({ action: 'deleteChat', data: { chatId: `${this.chatid}` } })
            this.$emit('deleted')
          }
        }
      })
    },
    hideAlerts () {
      this.closeDragElement()
      this.$store.commit(this.$store.state.mutedChats.includes(this.chatid) ? 'unmuteChat' : 'muteChat', this.chatid)
    }
  }
}
</script>

<style lang="scss">

  .unread {
    background-color: #0A84FF;
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
    border-bottom: 1px solid rgba(87,87,87,0.7);
    font-size: 13px;
    position: relative;
  }

  .text {
    color: rgb(157,157,157);
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
    color: rgb(157,157,157);
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
      background-color: #2284FF;

      .chatContent {
        border: none;

        .text {
          color: #A9D5FF;
        }

        .date {
          color: #A9D5FF;
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
        background: #FF3B2F;
      }

      .hideAlerts {
        background: #5959D1;
      }
    }
  }
</style>
