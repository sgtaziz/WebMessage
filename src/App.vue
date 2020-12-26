<template>
  <div id="app">
    <settings ref="settingsModal" @saved="connectWS"></settings>
    <div id="nav">
      <div class="titlebar">
        <div class="buttons">
          <div class="close" @click="closeWindow">
            <span class="closebutton"><span>x</span></span>
          </div>
          <div class="minimize" @click="minimizeWindow">
            <span class="minimizebutton"><span>&ndash;</span></span>
          </div>
          <div class="zoom" @click="maximizeWindow">
            <span class="zoombutton"><span>+</span></span>
          </div>
        </div>
        <div class="menuBtn">
          <feather type="settings" stroke="rgba(152,152,152,0.5)" size="20" @click="$refs.settingsModal.openModal()"></feather>
        </div>
        <div class="menuBtn">
          <feather type="edit" stroke="rgba(36,132,255,0.65)" size="20" @click="composeMessage"></feather>
        </div>
        <div class="menuBtn" v-if="updateAvailable">
          <feather type="download" stroke="rgba(152,255,152,0.65)" size="20" @click="restart"></feather>
        </div>
      </div>
      <div class="searchContainer">
        <input type="search" placeholder="Search" class="textinput" />
      </div>
      <simplebar class="chats" ref="chats" data-simplebar-auto-hide="false">
        <chat v-for="chat in chats" :key="chat.id" :chatid="chat.id"
          :author="chat.author"
          :text="chat.text"
          :date="chat.date"
          :read="chat.read"
          :docid="chat.docid"
          @navigated="setAsRead(chat)">
        </chat>
      </simplebar>
    </div>
    <div id="content">
      <router-view/>
    </div>
  </div>
</template>

<script>
import Chat from './components/Chat.vue'
import Settings from "./components/Settings.vue";
import simplebar from 'simplebar-vue'
import 'simplebar/dist/simplebar.css'

export default {
  name: 'App',
  components: {
    Chat,
    simplebar,
    Settings
  },
  data: function () {
    return {
      chats: [],
      limit: 25,
      offset: 0,
      loading: false,
      notifSound: new Audio(process.env.BASE_URL+'receivedText.mp3'),
      updateAvailable: false
    }
  },
  methods: {
    getWindow () {
      return window.remote.BrowserWindow.getFocusedWindow()
    },
    closeWindow () {
      this.getWindow().close()
    },
    minimizeWindow () {
      this.getWindow().minimize()
    },
    maximizeWindow () {
      const window = this.getWindow()
      !window.minimizedState ? window.unmaximize() : window.maximize()
    },
    restart () {
      ipcRenderer.send('restart_app')
    },
    requestChats (clear) {
      if (this.$socket && this.$socket.readyState == 1) {
        if (this.loading) return
        this.loading = true

        this.sendSocket({ action: 'fetchChats', data: {offset: `${this.offset}`, limit: `${this.limit}`} })
      } else {
        setTimeout(this.requestChats, 100)
      }
    },
    connectWS () {
      this.chats = []
      this.offset = 0
      this.loading = false

      const baseURI = this.$store.getters.baseURI
      this.$disconnect()
      this.$connect(baseURI, {
        format: 'json',
        reconnection: true,
      })
    },
    setAsRead (chat) {
      chat.read = true
    },
    composeMessage () {
      this.$router.push('/message/new')
    }
  },
  mounted () {
    this.connectWS()

    let container = this.$refs.chats.SimpleBar.getScrollElement()
    container.addEventListener('scroll', (e) => {
      if (container.scrollTop + container.offsetHeight == container.scrollHeight && !this.loading) {
        this.requestChats()
      }
    })

    ipcRenderer.send('loaded')

    ipcRenderer.on('update_available', () => {
      ipcRenderer.removeAllListeners('update_available')
      console.log('Update detected. Downloading...')
    })

    ipcRenderer.on('update_downloaded', () => {
      ipcRenderer.removeAllListeners('update_downloaded')
      console.log('Update downloaded. Waiting on user to restart.')
      this.updateAvailable = true
    })
  },
  socket: {
    fetchChats (data) {
      if (this.offset == 0) this.chats = data
      else this.chats.push(...data)
      this.offset += this.limit
      this.loading = false
    },
    newMessage (data) {
      var chatData = data.chat[0]

      if (chatData && chatData.id) {
        var chatIndex = this.chats.findIndex(obj => obj.id == chatData.id)

        if (chatIndex > -1) {
          this.chats.splice(chatIndex, 1)
        }

        this.chats.unshift(chatData)
      }

      var messageData = data.message[0]

      if (messageData && messageData.sender != 1 && remote.Notification.isSupported()) {
        const notification = {
          title: messageData.name,
          body: messageData.text,
          silent: true
        }

        this.notifSound.play()
        let notif = new remote.Notification(notification)
        notif.on('click', (event, arg) => {
          if (chatData && chatData.id) {
            this.$router.push('/message/'+chatData.id)
          }
        })
        notif.show()

      } else if (!remote.Notification.isSupported()) {
        console.log('Notifications are not supported on this system.')
      }
    },
    onopen () {
      this.requestChats()
    },
    onerror () {
      this.loading = false
    },
    onclose () {
      this.loading = false
    }
  }
}
</script>

<style lang="scss">
.emoji {
  position: relative;
  top: 0.15em;
  width: 14px;
}

.searchContainer {
  padding-right: 6px;
}

.menuBtn {
  -webkit-app-region: no-drag;
  width: auto;
  float: right;
  margin-right: 10px;

  .feather {
    cursor: pointer;

    &:hover {
      filter: brightness(80%);
    }
  }
}

.textinput {
  background-color: rgba(200,200,200,0.1);
  width: calc(100% - 4px);
  margin: 0 !important;
  margin-left: -2px !important;
  border: 0px none;
  border-color: rgba(87,87,87,0.7) !important;
  color: #EBECEC !important;
  text-align: left !important;
}

.chats {
  margin-top: 12px;
  max-height: calc(100% - 80px);

  .simplebar-scrollbar:before {
    background: #575757;
  }
}

@font-face {
  font-family: "San Francisco";
  font-weight: 400;
  src: url("https://applesocial.s3.amazonaws.com/assets/styles/fonts/sanfrancisco/sanfranciscodisplay-regular-webfont.woff");
}

@font-face {
  font-family: "San Francisco Bold";
  font-weight: 400;
  src: url("https://applesocial.s3.amazonaws.com/assets/styles/fonts/sanfrancisco/sanfranciscodisplay-bold-webfont.woff");
}

@font-face {
  font-family: "San Francisco Light";
  font-weight: 400;
  src: url("https://applesocial.s3.amazonaws.com/assets/styles/fonts/sanfrancisco/sanfranciscodisplay-light-webfont.woff");
}

html {
  height: 100%;
  max-height: 100%;
  width: 100%;
  background-color: rgba(29,29,29, 0);
}

body {
  margin: 0;
  height: calc(100% - 3px);
  max-height: 100%;
  width: calc(100% - 2px);
  background-color: rgba(29,29,29, 0);
  overflow: hidden;
  border: 1px solid rgb(0,0,0);
  border-radius: 10px;
}

#app {
  font-family: -apple-system, "San Francisco", Avenir, Helvetica, Arial, sans-serif;
  letter-spacing: 0.1px;
  text-align: center;
  color: #EBECEC;
  position: absolute;
  top: 1px; left: 1px; right: 1px; bottom: 2px;
  background-color: rgba(29,29,29, 0);
  border: 1px solid #4A4A4A;
  border-radius: 10px;
}

#nav {
  background-color: rgba(40,40,40,0.93);
  width: 311px;
  padding: 9px;
  padding-right: 0;
  float: left;
  position: absolute;
  top: 0; left: 0; bottom: 0;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

.titlebar {
  -webkit-app-region: drag;
  width: calc(100% - 10px);
  height: 30px;
  padding: 5px;
  padding-top: 7px;
}

.buttons {
  -webkit-app-region: no-drag;
  padding-left: 5px;
  padding-top: 3px;
  float: left;
  line-height: 0px;
}

.close {
  background: #ff5c5c;
  font-size: 9pt;
  line-height: 12px;
  width: 12px;
  height: 12px;
  border: 0px solid #e33e41;
  border-radius: 50%;
  display: inline-block;
}

.close:active {
  background: #c14645;
}

.closebutton {
  color: #820005;
  visibility: hidden;
  cursor: default;
}

.minimize {
  background: #ffbd4c;
  font-size: 9pt;
  line-height: 12px;
  margin-left: 8px;
  width: 12px;
  height: 12px;
  border: 0px solid #e09e3e;
  border-radius: 50%;
  display: inline-block;
}

.minimize:active {
  background: #c08e38;
}

.minimizebutton {
  color: #9a5518;
  visibility: hidden;
  cursor: default;
}

.zoom {
  background: #00ca56;
  font-size: 9pt;
  line-height: 12px;
  margin-left: 8px;
  width: 12px;
  height: 12px;
  border: 0px solid #14ae46;
  border-radius: 50%;
  display: inline-block;
}

.zoom:active {
  background: #029740;
}

.zoombutton {
  color: #006519;
  visibility: hidden;
  cursor: default;
}

#content {
  float: left;
  background-color: rgba(29,29,29, 1);
  position:fixed;
  top: 2px; left: 321px; right: 2px; bottom: 3px;
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  border-left: 1px solid #000;
  overflow: hidden;
}

input:not([type="range"]):not([type="color"]):not(.message-input) {
  height: auto;
  height: inherit;
  font-size: 13px;
  height: 6px;
  padding: 10px 6px 10px 6px;
  outline: none;
  border: 1px solid rgb(213, 213, 213);
  margin: 5px;
  cursor: text;
  -webkit-app-region: no-drag;
}

input:not([type="range"]):not([type="color"]):not(.message-input):focus {
  border-radius: 1px;
  box-shadow: 0px 0px 0px 3.5px rgba(23, 101, 144, 1);
  animation: showFocus .3s;
  border-color: rgb(122, 167, 221) !important;
}

@keyframes showFocus {
  0% {
    border-color: #dbdbdb;
    border-radius: -1px;
    box-shadow: 0px 0px 0px 14px rgba(23, 101, 144, 0);
    /*outline: 14px solid rgba(159, 204, 250, 0);
    outline-offset: 0px;*/
  }
  100% {
    border-color: rgb(122, 167, 221) !important;
    border-radius: 1px;
    box-shadow: 0px 0px 0px 3.5px rgba(23, 101, 144, 1);
    /*outline: 4px solid rgba(159, 204, 250, 1);
    outline-offset: -1px;*/
  }
}

input[type="search"] {
  text-indent: 0px;
  text-align: center;
  background-image: url('assets/search.svg');
  background-size: auto 50%, 100% 100%;
  background-position: 5px 6px, center;
  background-repeat: no-repeat;
  text-align: center;
  text-indent: 18px;
  height: 28px !important;
  border-radius: 5px !important;
}

input[type="search"]:focus {
  text-align: left;
  box-shadow: 0px 0px 0px 4.5px rgb(115, 166, 233);
  border-bottom-color: #f00 !important;
  border-radius: 4px !important;
}

input[type="search"]::-webkit-input-placeholder {
  /*text-align: center;*/
  color: rgb(152,152,152);
  font-weight: 400;
  letter-spacing: 0.2px;
}
</style>
