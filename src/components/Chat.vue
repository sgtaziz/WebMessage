<template>
  <div class="chatContainer" :class="this.$route.path == '/message/'+this.chatid ? 'active' : ''" :id="'id'+chatid" @click="navigate">
    <div class="unread" :style="read ? 'background-color: transparent;' : ''"></div>
    <div class="avatarContainer">
      <img v-if='(docid && docid != 0)' class="avatar" :src="`${$store.getters.httpURI}/contactimg?docid=${encodeURIComponent(docid)}&auth=${encodeURIComponent($store.state.password)}`" />
      <img v-else class="avatar" src="../assets/profile.jpg" />
    </div>
    <div class="chatContent">
      <div class="title">
        <span class="author" v-html="$options.filters.twemoji(author)"></span>
        <span class="date">{{ date | moment }}</span>
      </div>
      <div class="text">
        <span v-html="trimmedText"></span>
      </div>
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
    read: { type: Boolean }
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

      let localDate = moment(ts).format("l")
      let dateParts = localDate.split("/")
      dateParts[2] = dateParts[2].substring(2)
      let formattedDate = dateParts.join("/")
      return formattedDate
    }
  },
  methods: {
    navigate () {
      this.$emit('navigated')

      if (this.$route.path != '/message/'+this.chatid) {
        this.$router.push('/message/'+this.chatid)
      }
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
  }

  .date {
    font-weight: 200;
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
  }
</style>
