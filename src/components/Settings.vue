<template>
  <transition name="fade">
    <div class="modal" v-if="show">
      <popover name="tunnel" event="hover" transition="fade">{{ relayMessage }}</popover>
      <div class="modal__backdrop" @click="closeModal()" :class="{ nostyle: !($store.state.macstyle || process.platform === 'darwin') }"/>

      <div class="modal__dialog">
        <h3>Settings</h3>
        <input type="password" placeholder="Password" class="textinput" v-model="password" />
        <input type="text" placeholder="IP Address" class="textinput" v-model="ipAddress" :disabled="this.enableTunnel"/>
        <div class="tunnelToggle">
          <feather type="circle" size="20" @click="toggleTunnel" :fill="relayColor" v-popover:tunnel.bottom></feather>
        </div>
        <input ref="portField" type="number" placeholder="Port" class="textinput" min="1" max="65535" @keyup="enforceConstraints" v-model="port" />
        <label class="switch">
          <input type="checkbox" v-model="ssl">
          <i></i>
          <div>Enable SSL</div>
        </label>
        <hr>
        <label class="switch">
          <input type="checkbox" v-model="playsound">
          <i></i>
          <div>Custom notification sound</div>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="cacheMessages">
          <i></i>
          <div>Precache messages <span style="color: rgba(255,0,0,0.8);font-size: 12px;">More battery drain</span></div>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="startup">
          <i></i>
          <div>Launch on startup</div>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="minimize">
          <i></i>
          <div>Keep in tray</div>
        </label>
        <label class="switch" v-if="process.platform !== 'darwin'">
          <input type="checkbox" v-model="macstyle">
          <i></i>
          <div>Use macOS style</div>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="acceleration">
          <i></i>
          <div>Enable hardware acceleration</div>
        </label>
        <a class="btn" v-on:click="saveModal">Save</a>
        <a v-on:click="closeModal" class="btn destructive">Cancel</a>

        <div class="version">
          v{{version}}
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import usbmux from 'usbmux'

export default {
  name: "Settings",
  data() {
    return {
      show: false,
      password: '',
      ipAddress: '',
      port: 8180,
      ssl: false,
      playsound: false,
      launchOnStartup: false,
      minimize: true,
      macstyle: true,
      acceleration: true,
      version: '',
      process: window.process,
      relay: null,
      relayStatus: -1,
      relayMessage: "Tunneling is currently disabled. Click the circle and ensure your device is attached to enable it.",
      relayColor: 'rgba(152,152,152,0.5)',
      enableTunnel: false,
      cacheMessages: false
    }
  },
  beforeDestroy () {
    if (this.relay) {
      console.log('Destroying old tunnel...')
      this.relay.stop()
    }
  },
  methods: {
    toggleTunnel () {
      this.enableTunnel = !this.enableTunnel
      this.$store.commit('setTunnel', this.enableTunnel)
      if (this.enableTunnel) {
        this.initTunnel()
      } else {
        if (this.relay) {
          console.log('Destroying old tunnel...')
          this.relay.stop()
          this.$store.commit('setIPAddress', this.ipAddress)
          this.$emit('saved')
        }

        this.relayMessage = "Tunneling is currently disabled. Click the circle and ensure your device is attached to enable it."
        this.relayColor = 'rgba(152,152,152,0.5)'
      }
    },
    initTunnel () {
      if (this.relay) {
        console.log('Destroying old tunnel...')
        this.relay.stop()
      }

      console.log('Initiating tunnel...')

      this.relay = new usbmux.Relay(this.port, this.port)
        .on('error', (err) => {
          if (err.message.includes('No devices connected')) {
            this.relayMessage = "Error: No device is attached. Ensure that your device is plugged in and that you have iTunes installed."
            this.relayStatus = 0
            this.$store.commit('setIPAddress', this.ipAddress)
            this.$emit('saved')
            this.relayColor = 'rgba(255,0,0,0.5)'
          }
        })
        .on('warning', (err) => {
          if (err.message.includes('No devices connected')) {
            this.relayMessage = "Error: No device is attached. Ensure that your device is plugged in and that you have iTunes installed."
            this.relayStatus = 0
            this.$store.commit('setIPAddress', this.ipAddress)
            this.$emit('saved')
            this.relayColor = 'rgba(255,0,0,0.5)'
          }
        })
        .on('attached', () => {
          this.relayMessage = "Tunneling is active and your device is attached. We will automatically setup the settings for you."
          this.relayStatus = 1
          this.$store.commit('setIPAddress', '127.0.0.1')
          if (this.$socket && this.$socket.readyState == 1) window.location.reload()
          setTimeout(() => { this.$emit('saved') }, 10)
          this.relayColor = 'rgba(0,255,0,0.5)'
        })
    },
    saveModal() {
      let reloadApp = this.$store.state.macstyle != this.macstyle || this.$store.state.acceleration != this.acceleration

      this.$store.commit('setPassword', this.password)
      this.$store.commit('setIPAddress', this.ipAddress)
      this.$store.commit('setFallbackIPAddress', this.ipAddress)
      this.$store.commit('setPort', this.port)
      this.$store.commit('setSSL', this.ssl)
      this.$store.commit('setPlaySound', this.playsound)
      this.$store.commit('setStartup', this.startup)
      this.$store.commit('setMinimize', this.minimize)
      this.$store.commit('setMacStyle', this.macstyle)
      this.$store.commit('setAcceleration', this.acceleration)
      this.$store.commit('setCacheMessages', this.cacheMessages)
      this.show = false
      if (this.enableTunnel) {
        this.initTunnel()
      } else {
        this.$emit('saved')
      }
      

      if (reloadApp) ipcRenderer.send('reload_app')
    },
    closeModal() {
      this.show = false
    },
    openModal() {
      this.show = true
    },
    loadValues() {
      this.password = this.$store.state.password
      this.ipAddress = this.$store.state.fallbackIpAddress != '' ? this.$store.state.fallbackIpAddress : this.ipAddress
      this.port = this.$store.state.port
      this.ssl = this.$store.state.ssl
      this.playsound = this.$store.state.playsound
      this.startup = this.$store.state.startup
      this.minimize = this.$store.state.minimize
      this.macstyle = this.$store.state.macstyle
      this.acceleration = this.$store.state.acceleration
      this.enableTunnel = this.$store.state.enableTunnel
      this.cacheMessages = this.$store.state.cacheMessages
      if (this.enableTunnel) {
        this.initTunnel()
      }
    },
    enforceConstraints() {
      var el = this.$refs.portField
      if (el.value != "") {
        if (parseInt(el.value) < parseInt(el.min)) {
          this.port = el.min
        }
        if (parseInt(el.value) > parseInt(el.max)) {
          this.port = el.max
        }
      }
    }
  },
  mounted () {
    this.loadValues()

    ipcRenderer.send('app_version')
    ipcRenderer.on('app_version', (event, arg) => {
      ipcRenderer.removeAllListeners('app_version')
      this.version = arg.version
    })
  }
}
</script>


<style lang="scss" scoped>
.version {
  font-size: 12px;
  margin-bottom: -18px;
  color: gray;
}

.tunnelToggle {
  margin-top: -38px;
  padding-bottom: 14px;
  width: 20px;
  position: relative;
  left: 266px;
  cursor: pointer;

  .desc {
    position: absolute;
    top: -27px;
    right: 30px;
    width: 180px;
    height: 55px;
    text-align: left;
    background-color: rgba(25,25,25,0.9);
    padding: 10px;
    border-radius: 5px;
    font-size: 13px;
    display: inherit !important; /* override v-show display: none */
    transition: opacity 0.3s;

    &[style*="display: none;"] {
      opacity: 0;
      pointer-events: none; /* disable user interaction */
      user-select: none; /* disable user selection */
    }
  }
}

.modal {
  overflow: hidden;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;

  &__backdrop {
    background-color: rgba(0, 0, 0, 0.3);
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    border-radius: 10px;

    &.nostyle {  
      border-radius: 0px;
    }
  }

  &__dialog {
    background-color: darken(#373737, 5%);
    border: 1px solid darken(#282C2D, 10%);
    padding: 1.5rem;
    position: relative;
    top: 50%;
    transform: translateY(-50%);
    max-width: 300px;
    margin: auto auto;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    z-index: 2;

    .textinput {
      width: auto;
      margin: 0px 5px !important;
      margin-bottom: 10px !important;
      border-radius: 0.5em;
      height: 14px !important;

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      &:disabled {
        color: gray !important;
        text-decoration: line-through;
        cursor: not-allowed;
      }
    }

    h3 {
      margin-top: 0;
    }

    hr {
      width: 100%;
      height: 1px;
      border: none;
      background: gray;
      padding: 0;
      margin-top: 8px;
      margin-bottom: 18px;
    }

    img {
      width: 64px;
    }

    a.btn {
      cursor: pointer;
      border-radius: 0.5em;
      line-height: 1;
      border: none;
      font-weight: normal;
      background-color: #42474A;
      color: #B5AFA6;
      padding: 0.65rem;
      margin: 0.25rem;
      font-size: 1rem;
      box-shadow: none;

      &:hover {
        background-color: darken(#42474A, 5%);
      }

      &:active {
        background-color: darken(#42474A, 10%);
      }

      &.destructive {
        color: #DF4655;
      }

      &.cancel {
        margin-top: 0.75rem;
      }
    }

    @media screen and (max-width: 992px) {
      width: 90%;
    }
  }

  &__close {
    width: 30px;
    height: 30px;
  }

  &__header {
    padding: 20px 20px 10px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  &__body {
    padding: 10px 20px 10px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  &__footer {
    padding: 10px 20px 20px;
  }
}

.switch {
  padding-left: 8px;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  margin-bottom: 10px;

  div {
    display: inline;
    font-size: 15px;
    width: calc(100% - 46px);
    line-height: 0rem;
  }

  i {
    position: relative;
    display: inline-block;
    margin-right: .6rem;
    margin-top: -2px;
    width: 46px;
    height: 26px;
    background-color: #e6e6e6;
    border-radius: 23px;
    vertical-align: middle;
    transition: all 0.3s linear;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      width: 42px;
      height: 22px;
      background-color: #fff;
      border-radius: 11px;
      transform: translate3d(2px, 2px, 0) scale3d(1, 1, 1);
      transition: all 0.25s linear;
    }

    &::after {
      content: "";
      position: absolute;
      left: 0;
      width: 22px;
      height: 22px;
      background-color: #fff;
      border-radius: 11px;
      box-shadow: 0 2px 2px rgba(0, 0, 0, 0.24);
      transform: translate3d(2px, 2px, 0);
      transition: all 0.2s ease-in-out;
    }
  }

  &:active i::after {
    width: 28px;
    transform: translate3d(2px, 2px, 0);
  }

  &:active input:checked + i::after {
    transform: translate3d(16px, 2px, 0);
  }

  input {
    display: none;
  }

  input:checked + i {
    background-color: #4BD763;
  }

  input:checked + i::before {
    transform: translate3d(18px, 2px, 0) scale3d(0, 0, 0);
  }

  input:checked + i::after {
    transform: translate3d(22px, 2px, 0);
  }
}
</style>
