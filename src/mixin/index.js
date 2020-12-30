export default {
  sockets: {
    onmessage ({ data }) {
      data.text().then((payload) => {
        let json = JSON.parse(payload)

        if (this.$options.socket && json) {
          Object.keys(this.$options.socket).forEach(action =>  {
            if (json.action == action) {
              this.$options.socket[action].call(this, json.data)
            }
          })
        }
      })
    },
    onopen (e) {
      if (this.$options.socket && this.$options.socket.onopen) {
        this.$options.socket.onopen.call(this, e)
      }
    },
    onclose (e) {
      if (this.$options.socket && this.$options.socket.onclose) {
        this.$options.socket.onclose.call(this, e)
      }
    },
    onerror (e) {
      if (this.$options.socket && this.$options.socket.onerror) {
        this.$options.socket.onerror.call(this, e)
      }
    }
  },
  methods: {
    sendSocket(obj) {
      obj.password = this.$store.state.password
      return this.$socket.send(JSON.stringify(obj))
    }
  }
}
