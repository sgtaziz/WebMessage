<template>
  <transition name="fade">
    <div class="modal" v-if="show">
      <div class="modal__backdrop" @click="closeModal()"/>

      <div class="modal__dialog">
        <!-- <img src="https://upload.wikimedia.org/wikipedia/en/7/78/Apple_Mail.png?download" alt=""> -->
        <h3>Settings</h3>
        <input type="password" placeholder="Password" class="textinput" v-model="password" />
        <input type="text" placeholder="IP Address" class="textinput" v-model="ip" />
        <input ref="portField" type="number" placeholder="Port" class="textinput" min="1" max="65535" @keyup="enforceConstraints" v-model="port" />
        <label class="switch">
          <div>Enable SSL</div>
          <input type="checkbox" v-model="ssl">
          <i></i>
        </label>
        <a class="btn" v-on:click="saveModal">Save</a>
        <a v-on:click="closeModal" class="btn destructive">Cancel</a>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "Settings",
  data() {
    return {
      show: false,
      password: '',
      ip: '',
      port: null,
      ssl: false
    }
  },
  methods: {
    saveModal() {
      this.$store.commit('setPassword', this.password)
      this.$store.commit('setIPAddress', this.ip)
      this.$store.commit('setPort', this.port)
      this.$store.commit('setSSL', this.ssl)
      this.show = false

      this.$emit('saved')
    },
    closeModal() {
      this.loadValues()
      this.show = false
    },
    openModal() {
      this.show = true
    },
    loadValues() {
      this.password = this.$store.state.password
      this.ip = this.$store.state.ipAddress
      this.port = this.$store.state.port
      this.ssl = this.$store.state.ssl
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
  }
}
</script>


<style lang="scss" scoped>
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
  }

  &__dialog {
    background-color: darken(#373737, 5%);
    border: 1px solid darken(#282C2D, 10%);
    padding: 1.5rem;
    position: relative;
    max-width: 300px;
    margin: 100px auto;
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
    }

    h3 {
      margin-top: 0;
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

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.switch {
  display: inline-block;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  margin-bottom: 20px;
  width: 130px;

  div {
    float: right;
    margin-top: 4px;
    margin-left: -4px;
    font-size: 15px;
  }
}

.switch i {
  position: relative;
  display: inline-block;
  margin-right: .5rem;
  width: 46px;
  height: 26px;
  background-color: #e6e6e6;
  border-radius: 23px;
  vertical-align: middle;
  transition: all 0.3s linear;
}

.switch i::before {
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

.switch i::after {
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

.switch:active i::after {
  width: 28px;
  transform: translate3d(2px, 2px, 0);
}

.switch:active input:checked + i::after {
  transform: translate3d(16px, 2px, 0);
}

.switch input {
  display: none;
}

.switch input:checked + i {
  background-color: #4BD763;
}

.switch input:checked + i::before {
  transform: translate3d(18px, 2px, 0) scale3d(0, 0, 0);
}

.switch input:checked + i::after {
  transform: translate3d(22px, 2px, 0);
}
</style>
