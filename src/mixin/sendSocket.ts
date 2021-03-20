const mixin = {
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
