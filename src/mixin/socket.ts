let lastCalledData: Nullable<Blob> = null
let lastCalledComponent: Nullable<string> = null

const mixin = {
  sockets: {
    onmessage({ data }: { data: Blob }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const self = this as any
      if (lastCalledData != null && lastCalledData == data && lastCalledComponent != null && lastCalledComponent == self.$options.name)
        return
      lastCalledData = data
      lastCalledComponent = self.$options.name

      data.text().then(payload => {
        const json = JSON.parse(payload)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        if (self.$options.socket && json) {
          Object.keys(self.$options.socket).forEach(action => {
            if (json.action == action) {
              self.$options.socket[action].call(self, json.data)
            }
          })
        }
      })
    },
    onopen(e: Event) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const self = this as any
      if (self.$options.socket && self.$options.socket.onopen) {
        self.$options.socket.onopen.call(self, e)
      }
    },
    onclose(e: Event) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const self = this as any
      if (self.$options.socket && self.$options.socket.onclose) {
        self.$options.socket.onclose.call(self, e)
      }
    },
    onerror(e: Event) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const self = this as any
      if (self.$options.socket && self.$options.socket.onerror) {
        self.$options.socket.onerror.call(self, e)
      }
    },
  },
  methods: {
    sendSocket(obj: { password: string }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const self = this as any
      obj.password = self.$store.state.password
      self.$socket.send(JSON.stringify(obj))
    },
  },
}

export default mixin
