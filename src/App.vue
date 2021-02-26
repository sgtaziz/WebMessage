<template>
  <div id="app" :class="{ nostyle: !($store.state.macstyle || process.platform === 'darwin'), maximized: (maximized || !$store.state.acceleration) && process.platform !== 'darwin' }">
    <vue-confirm-dialog class="confirmDialog"></vue-confirm-dialog>
    <settings ref="settingsModal" @saved="connectWS"></settings>
    <div id="nav" :class="{ notrans: !$store.state.acceleration }">
      <div class="titlebar">
        <div class="buttons" v-if="$store.state.macstyle || process.platform === 'darwin'">
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
        <div class="statusIndicator" style="margin-top: 1px;">
          <feather type="circle" stroke="rgba(25,25,25,0.5)" :fill="statusColor" size="10" v-popover:status.bottom></feather>
        </div>
        <popover name="status" event="hover" transition="fade">
          {{ statusText }}
        </popover>
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
        <input type="search" placeholder="Search" class="textinput" v-model="search" />
      </div>
      <simplebar class="chats" ref="chats" data-simplebar-auto-hide="false">
        <chat v-for="chat in filteredChats" :key="chat.id"
          :chatid="chat.personId"
          :author="chat.author"
          :text="chat.text"
          :date="chat.date"
          :read="chat.read"
          :docid="chat.docid"
          :showNum="chat.showNum"
          @deleted="deleteChat(chat)">
        </chat>
      </simplebar>
    </div>
    <div id="content">
      <transition name="fade" mode="out-in">
        <router-view @markAsRead="markAsRead"></router-view>
      </transition>
    </div>
  </div>
</template>

<script>
import Chat from './components/Chat.vue'
import Settings from "./components/Settings.vue"
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
      limit: 50,
      offset: 0,
      loading: false,
      notifSound: null,
      updateAvailable: false,
      search: '',
      process: window.process,
      maximized: false,
      maximizing: false,
      win: null,
      status: 0 // 0 for disconnected, 1 for connecting, 2 for connected
    }
  },
  computed: {
    filteredChats() {
      let chats = this.chats

      if (chats.length > 0) {
        chats = chats.reduce((r, chat) => {
          chat.showNum = false
          
          let duplicateIndex = this.chats.findIndex(obj => obj.author == chat.author && obj.address != chat.address)
          if (duplicateIndex > -1 && !chat.address.startsWith('chat') && (chat.address.startsWith('+') || chat.address.includes('@'))) {
            chat.showNum = true
          }

          r.push(chat)
          return r
        }, [])
      }

      return chats.filter((chat) => {
        return chat.author.toLowerCase().includes(this.search.toLowerCase()) || chat.text.toLowerCase().includes(this.search.toLowerCase())
      }).sort((a, b) => (b.date - a.date > 0 ? 1 : -1))
    },
    statusColor () {
      if (this.status == 0) {
        return "rgba(255,0,0,0.8)"
      } else if (this.status == 1) {
        return "rgba(255,100,0,0.8)"
      } else if (this.status == 2) {
        return "rgba(0,255,0,0.5)"
      }
    },
    statusText () {
      if (this.status == 0) {
        return "Device not found"
      } else if (this.status == 1) {
        return "Device found. Retrieving data..."
      } else if (this.status == 2) {
        return "Device connected"
      }
    }
  },
  methods: {
    markAsRead (val) {
      let chatIndex = this.chats.findIndex(obj => obj.personId == val)
      if (chatIndex > -1) {
        let chat = this.chats[chatIndex]

        if (!chat.read) {
          if (document.hasFocus()) {
            chat.read = true
            this.sendSocket({ action: 'markAsRead', data: { chatId: this.$route.params.id } })
          } else {
            let onFocusHandler = () => {
              if (!chat.read && this.$route.path == '/message/'+val) {
                chat.read = true
                this.sendSocket({ action: 'markAsRead', data: { chatId: this.$route.params.id } })
              }

              window.removeEventListener('focus', onFocusHandler)
            }
            
            window.addEventListener('focus', onFocusHandler)
          }
        }
      }
    },
    closeWindow () {
      if (this.$store.state.minimize) {
        ipcRenderer.send('minimizeToTray')
      } else {
        ipcRenderer.send('quitApp')
      }
    },
    minimizeWindow () {
      this.win.minimize()
    },
    maximizeWindow () {
      this.maximizing = true
      if (this.maximized) {
        this.win.restore()
        this.win.setSize(700,600)
        this.win.center()
        if (process.platform !== 'darwin') document.body.style.borderRadius = null
      } else {
        this.win.maximize()
        if (process.platform !== 'darwin') document.body.style.borderRadius = '0'
      }

      this.maximized = !this.maximized
      setTimeout(() => {
        this.maximizing = false
      }, 50)
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
      this.$disconnect()
      this.status = 0
      this.chats = []
      this.$store.commit('resetMessages')
      this.$router.push('/').catch(()=>{})
      this.notifSound = new Audio(this.$store.state.notifSound)

      const baseURI = this.$store.getters.baseURI
      this.$connect(baseURI, {
        format: 'json',
        reconnection: true,
      })
    },
    deleteChat (chat) {
      var chatIndex = this.chats.findIndex(obj => obj.personId == chat.personId)
      if (chatIndex > -1) {
        this.chats.splice(chatIndex, 1)
      }

      if (this.$route.path == '/message/'+chat.personId) {
        this.$router.push('/')
      }

      this.$store.state.messagesCache[chat.personId] = null
    },
    composeMessage () {
      if (this.status == 2) this.$router.push('/message/new')
    },
    onMove (e) {
      e.preventDefault()
      if (this.maximizing) return
      if (this.maximized) {
        this.win.restore()
        if (process.platform !== 'darwin') document.body.style.borderRadius = null
        this.maximized = false
      }
    },
    cacheMessages () {
      if (!this.$store.state.cacheMessages) return

      if (this.$socket && this.$socket.readyState == 1) {
        for (let i = 0; i < this.chats.length; i++) {
          let chat = this.chats[i]
          this.sendSocket({ action: 'fetchMessages', data: {
              id: chat.personId,
              offset: `0`,
              limit: `25`
            }
          })
        }
      } else {
        setTimeout(this.cacheMessages, 1000)
      }
    }
  },
  beforeDestroy () {
    $(window).off('resize')
    this.win.removeListener('move', this.onMove)
    ipcRenderer.removeAllListeners('win_id')
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
    })

    ipcRenderer.on('update_downloaded', () => {
      ipcRenderer.removeAllListeners('update_downloaded')
      this.updateAvailable = true
    })

    ipcRenderer.on('navigateTo', (sender, id) => {
      if (isNaN(id)) {
        this.$router.push('/message/new').catch(()=>{})
      } else {
        let arrayId = parseInt(id) - 1
        if (this.chats[arrayId]) {
          this.$router.push('/message/'+this.chats[arrayId].personId).catch(()=>{})
        }
      }
    })

    ipcRenderer.on('win_id', (e, id) => {
      this.win = window.remote.BrowserWindow.fromId(id)

      window.addEventListener('resize', (e) => {
        if (this.maximizing) return
        if (this.maximized) {
          this.win.restore()
          if (process.platform !== 'darwin') document.body.style.borderRadius = null
          this.maximized = false
        }
      })

      this.win.on('move', this.onMove)
    })

    this.notifSound = new Audio(this.$store.state.notifSound)

    if (!(this.$store.state.macstyle || process.platform === 'darwin')) {
      document.body.style.border = 'none'
      document.body.style.borderRadius = '0'
    }

    if (!this.$store.state.acceleration) {
      document.documentElement.style.backgroundColor = "black"
    }
  },
  socket: {
    fetchChats (data) {
      if (this.offset == 0) this.chats = data
      else this.chats.push(...data)
      this.offset += this.limit
      this.loading = false
      this.cacheMessages()
      this.status = 2
    },
    fetchMessages (data) {
      if (data && data[0] && !this.$store.state.messagesCache[data[0].personId]) {
        this.$store.commit('addMessages', { id: data[0].personId, data: data })
      }
    },
    newMessage (data) {
      var chatData = data.chat[0]

      if (chatData && chatData.personId) {
        var chatIndex = this.chats.findIndex(obj => obj.personId == chatData.personId)

        if (chatIndex > -1) {
          this.chats.splice(chatIndex, 1)
        }

        this.chats.unshift(chatData)
      }

      var messageData = data.message[0]

      if (messageData) {
        if (this.$store.state.messagesCache[messageData.personId]) {
          let oldMsgIndex = this.$store.state.messagesCache[messageData.personId].findIndex(obj => obj.guid == messageData.guid)
          if (oldMsgIndex != -1) {
            this.$store.state.messagesCache[messageData.personId][oldMsgIndex] = messageData
            return
          }
          this.$store.state.messagesCache[messageData.personId].unshift(messageData)
        }

        if (messageData.sender != 1 && remote.Notification.isSupported()) {
          if (this.$store.state.mutedChats.includes(messageData.personId)) return
          
          const notification = {
            title: messageData.name,
            body: messageData.text.replace(/\u{fffc}/gu, ""),
            silent: !this.$store.state.systemSound
          }

          if (process.platform === 'win32') {
            notification.icon = __static + '/icon.png'
          }

          if (!this.$store.state.systemSound) this.notifSound.play()
          let notif = new remote.Notification(notification)
          
          notif.on('click', (event, arg) => {
            if (chatData && chatData.id) {
              ipcRenderer.send('show_win')
              this.$router.push('/message/'+messageData.personId)
            }
          })
          notif.show()
        } else if (messageData.sender != 1) {
          console.log('Notifications are not supported on this system.')
        }
      }
    },
    newReaction (data) {
      let reactions = data.reactions
      if (reactions && reactions.length > 0 && this.$store.state.messagesCache[reactions[0].personId]) {
        let msgIndex = this.$store.state.messagesCache[reactions[0].personId].findIndex(obj => obj.guid == reactions[0].forGUID)
        if (msgIndex > -1) {
          this.$store.state.messagesCache[reactions[0].personId][msgIndex].reactions = reactions
        }
      }

      let chatData = data.chat[0]

      if (chatData && chatData.personId) {
        let chatIndex = this.chats.findIndex(obj => obj.personId == chatData.personId)

        if (chatIndex > -1) {
          this.chats.splice(chatIndex, 1)
        }
        this.chats.unshift(chatData)
      }
      
      if (reactions && reactions.length > 0 && reactions[0].sender != 1 && remote.Notification.isSupported()) {
        let reaction = reactions[0]
        if (this.$store.state.mutedChats.includes(reaction.personId)) return
        
        const notification = {
          title: chatData.author,
          body: chatData.text.replace(/\u{fffc}/gu, ""),
          silent: !this.$store.state.systemSound
        }

        if (process.platform === 'win32') {
          notification.icon = __static + '/icon.png'
        }

        if (!this.$store.state.systemSound) this.notifSound.play()
        let notif = new remote.Notification(notification)
        
        notif.on('click', (event, arg) => {
          if (chatData && chatData.id) {
            ipcRenderer.send('show_win')
            this.$router.push('/message/'+reaction.personId)
          }
        })
        notif.show()
      } else if (reactions && reactions.length > 0 && reactions[0].sender != 1) {
        console.log('Notifications are not supported on this system.')
      }
    },
    setAsRead (data) {
      if (this.$store.state.messagesCache[data.chatId]) {
        let messageIndex = this.$store.state.messagesCache[data.chatId].findIndex(obj => obj.guid == data.guid)
        if (messageIndex > -1) {
          this.$store.state.messagesCache[data.chatId][messageIndex]['dateRead'] = data.read
          this.$store.state.messagesCache[data.chatId][messageIndex]['dateDelivered'] = data.delivered
        }
      }
    },
    removeChat (data) {
      if (data.chatId) {
        let chatId = data.chatId
        var chatIndex = this.chats.findIndex(obj => obj.address == chatId)

        if (chatIndex > -1) {
          let chat = this.chats[chatIndex]
          if (this.$route.path == '/message/'+chat.personId) {
            this.$router.push('/')
          }
          this.$store.state.messagesCache[chat.personId] = null
          this.chats.splice(chatIndex, 1)
        }
      }
    },
    onopen () {
      this.offset = 0
      this.requestChats()
      this.status = 1
    },
    onerror () {
      this.loading = false
      if (this.$socket && this.$socket.readyState == 1) return
      this.status = 1
      this.$store.commit('resetMessages')
      this.$router.push('/').catch(()=>{})
      this.chats = []
    },
    onclose (e) {
      this.loading = false
      if (this.$socket && this.$socket.readyState == 1) return
      this.status = 0
      this.$store.commit('resetMessages')
      this.$router.push('/').catch(()=>{})
      this.chats = []
    }
  }
}
</script>

<style lang="scss">
.confirmDialog {
  .vc-container {
    background-color: rgba(45,45,45, 0.9);
    border: 1px solid rgba(25,25,25,0.9);
    .vc-text {
      color: white;
      font-weight: 300;
      font-size: 14px;
    }
    .vc-title {
      color: white;
      font-weight: 500;
    }
  }

  .vc-btn {
    background-color: rgba(45,45,45, 0.9);
    border-color: rgba(25,25,25,0.9) !important;
    color: rgba(255,0,0,0.9);

    &:hover {
      background-color: rgba(45,45,45, 0.9);
      filter: brightness(90%);
    }

    &.left {
      color: #4083ff;
    }
  }
}

.vue-popover {
  background: rgba(25,25,25,0.8) !important;
  font-size: 14px;
  &::before {
    border-bottom-color: rgba(25,25,25,0.8) !important;
  }
}

.emoji {
  position: relative;
  top: 0.15em;
  width: 13px;
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

.statusIndicator {
  width: auto;
  float: right;
  margin-right: 10px;
  -webkit-app-region: no-drag;
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

@import url('https://fonts.googleapis.com/css?family=Roboto:light,regular,medium,thin,italic,mediumitalic,bold');

html {
  height: 100%;
  max-height: 100%;
  width: 100%;
  background-color: rgba(29,29,29,0);
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
  font-weight: 300;
}

body {
  margin: 0;
  height: calc(100% - 2px);
  max-height: 100%;
  width: calc(100% - 2px);
  background-color: rgba(29,29,29, 0);
  overflow: hidden;
  border: 1px solid rgb(0,0,0);
  border-radius: 10px;
}

#app {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
  font-weight: 300;
  text-align: center;
  color: #EBECEC;
  position: absolute;
  top: 1px; left: 1px; right: 1px; bottom: 1px;
  background-color: rgba(29,29,29, 0);
  border: 1px solid #4A4A4A;
  border-radius: 10px;

  &.maximized {
    border-radius: 0;

    #nav {
      border-radius: 0;
    }

    #content {
      border-radius: 0;
    }
  }

  &.nostyle {
    background-color: rgba(40,40,40,1);
    border: none;
    border-radius: 0;
    height: 100%;
    width: 100%;

    #nav {
      border-radius: 0 !important;
      margin-left: -1px;
      margin-top: -1px;
      width: 312px;
    }

    #content {
      bottom: 0; right: 0; top: 0;
      border-radius: 0;
    }
  }
}

.fade-enter {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.2s ease;
}

.fade-leave-active {
  transition: opacity 0.2s ease;
  opacity: 0;
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

  &.notrans {
    background-color: rgba(40,40,40,1);
  }

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
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
  padding-right: 20px;
  float: left;
  line-height: 0px;

  div:hover {
    filter: brightness(75%);
  }
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
  top: 2px; left: 321px; right: 2px; bottom: 2px;
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  border-left: 1px solid #000;
  overflow: hidden;
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
