<template>
  <div
    id="vueApp"
    :class="{
      nostyle: !($store.state.macstyle || window.process.platform === 'darwin'),
      maximized: (window.state.maximized || !$store.state.acceleration) && window.process.platform !== 'darwin',
    }"
  >
    <settings ref="settingsModal" @saved="chats.connectWS"></settings>
    <div id="nav" :class="{ notrans: !$store.state.acceleration }">
      <div class="titlebar">
        <div class="buttons" v-if="$store.state.macstyle || window.process.platform === 'darwin'">
          <div class="close" @click="window.closeWindow">
            <span class="closebutton"><span>x</span></span>
          </div>
          <div class="minimize" @click="window.minimizeWindow">
            <span class="minimizebutton"><span>&ndash;</span></span>
          </div>
          <div class="zoom" @click="window.maximizeWindow">
            <span class="zoombutton"><span>+</span></span>
          </div>
        </div>
        <div class="statusIndicator" style="margin-top: 1px;" v-tooltip:bottom.tooltip="window.statusText.value">
          <feather type="circle" stroke="rgba(25,25,25,0.5)" :fill="window.statusColor.value" size="10"></feather>
        </div>
        <div class="menuBtn">
          <feather type="settings" stroke="rgba(152,152,152,0.5)" size="20" @click="$refs.settingsModal.openModal()"></feather>
        </div>
        <div class="menuBtn">
          <feather type="refresh-cw" stroke="rgba(152,152,152,0.5)" size="19" @click="chats.connectWS"></feather>
        </div>
        <div class="menuBtn">
          <feather type="edit" stroke="rgba(36,132,255,0.65)" size="20" @click="chats.composeMessage"></feather>
        </div>
        <div class="menuBtn" v-if="window.updateAvailable">
          <feather type="download" stroke="rgba(152,255,152,0.65)" size="20" @click="window.restart"></feather>
        </div>
      </div>
      <div class="searchContainer">
        <input type="search" placeholder="Search" class="textinput" v-model="chats.search" />
      </div>
      <div class="chats scrollable" ref="chatsContainer">
        <chat
          v-for="chat in chats.filteredChats.value"
          :key="chat.id"
          :chatid="chat.personId"
          :author="chat.author"
          :text="chat.text"
          :date="chat.date"
          :read="chat.read"
          :docid="chat.docid"
          :showNum="chat.showNum"
          :isGroup="chat.personId.startsWith('chat') && !chat.personId.includes('@') && chat.personId.length >= 20"
          @deleted="deleteChat(chat)"
        />
      </div>
    </div>
    <div id="content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" @markAsRead="chats.markAsRead" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script lang="ts">
import Chat from '@/components/Chat.vue'
import Settings from '@/components/Settings.vue'
import Tooltip from '@/components/Tooltip.vue'
import chatsComp from './chats'
import windowComp from './window'
import notificationsComp from './notifications'

export default {
  name: 'App',
  components: {
    Chat,
    Settings,
    Tooltip,
  },
  setup() {
    const chats = chatsComp()
    const window = windowComp()
    const notifications = notificationsComp()

    return { chats, window, notifications }
  },
}
</script>

<style lang="scss">
.text-emoji {
  width: 16px;
  height: 16px;
  margin-top: -2px;
  margin-bottom: -3px;
  // margin-right: 1px;
}

.confirmDialog {
  .vc-container {
    background-color: rgba(45, 45, 45, 0.9);
    border: 1px solid rgba(25, 25, 25, 0.9);
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
    background-color: rgba(45, 45, 45, 0.9);
    border-color: rgba(25, 25, 25, 0.9) !important;
    color: rgba(255, 0, 0, 0.9);

    &:hover {
      background-color: rgba(45, 45, 45, 0.9);
      filter: brightness(90%);
    }

    &.left {
      color: #4083ff;
    }
  }
}

.vue-popover {
  background: rgba(25, 25, 25, 0.8) !important;
  font-size: 14px;
  &::before {
    border-bottom-color: rgba(25, 25, 25, 0.8) !important;
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
  background-color: rgba(200, 200, 200, 0.1);
  width: calc(100% - 4px);
  margin: 0 !important;
  margin-left: -2px !important;
  border: 0px none;
  border-color: rgba(87, 87, 87, 0.7) !important;
  color: #ebecec !important;
  text-align: left !important;
}

.chats {
  margin-top: 12px;
  max-height: calc(100% - 73px);
  margin-right: 1px;
  overflow-y: auto;
  overflow-x: hidden;

  .simplebar-scrollbar:before {
    background: #575757;
  }
}

.scrollable {
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #424241;
    border-radius: 16px;
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

@import url('https://fonts.googleapis.com/css?family=Roboto:light,regular,medium,thin,italic,mediumitalic,bold');

html {
  height: 100%;
  max-height: 100%;
  width: 100%;
  background-color: rgba(29, 29, 29, 0);
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
  font-weight: 300;
}

body {
  margin: 0;
  height: calc(100% - 2px);
  max-height: 100%;
  width: calc(100% - 2px);
  background-color: rgba(29, 29, 29, 0);
  overflow: hidden;
  border: 1px solid rgb(0, 0, 0);
  border-radius: 10px;
}

#vueApp {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
  font-weight: 300;
  text-align: center;
  color: #ebecec;
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: rgba(29, 29, 29, 0);
  border: 1px solid #4a4a4a;
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
    background-color: rgba(40, 40, 40, 1);
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
      bottom: 0;
      right: 0;
      top: 0;
      border-radius: 0;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, backdrop-filter 0.2s ease;
}

.fade-enter-from,
.fade-leave-active {
  opacity: 0;
}

#nav {
  background-color: rgba(40, 40, 40, 0.93);
  width: 311px;
  padding: 9px;
  padding-right: 0;
  float: left;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;

  &.notrans {
    background-color: rgba(40, 40, 40, 1);
  }

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }

  input:not([type='range']):not([type='color']):not(.message-input) {
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

  input:not([type='range']):not([type='color']):not(.message-input):focus {
    border-radius: 1px;
    box-shadow: 0px 0px 0px 3.5px rgba(23, 101, 144, 1);
    animation: showFocus 0.3s;
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
  background-color: rgba(29, 29, 29, 1);
  position: fixed;
  top: 1px;
  left: 321px;
  right: 1px;
  bottom: 1px;
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

input[type='search'] {
  text-indent: 0px;
  text-align: center;
  background-image: url('../../assets/search.svg');
  background-size: auto 50%, 100% 100%;
  background-position: 5px 6px, center;
  background-repeat: no-repeat;
  text-align: center;
  text-indent: 18px;
  height: 28px !important;
  border-radius: 5px !important;
}

input[type='search']:focus {
  text-align: left;
  box-shadow: 0px 0px 0px 4.5px rgb(115, 166, 233);
  border-bottom-color: #f00 !important;
  border-radius: 4px !important;
}

input[type='search']::-webkit-input-placeholder {
  /*text-align: center;*/
  color: rgb(152, 152, 152);
  font-weight: 400;
  letter-spacing: 0.2px;
}
</style>
