<template>
  <video class="videoplayer" controls width="100%" @canplay="handleLoad" @canplaythrough="handleLoad" @loadeddata="handleLoad">
    <source :src="`${$store.getters.httpURI}/attachments?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}&auth=${encodeURIComponent($store.state.password)}`"
      :type="type.includes('quicktime') ? 'video/mp4' : type" />
    <!-- <source :src="`${$store.getters.httpURI}/attachments?path=${encodeURIComponent(path)}&type=${type}&auth=${$store.state.password}`"
      type="video/ogg" /> -->
      This video type is not supported.
  </video>
</template>

<script>

export default {
  name: "VideoPlayer",
  props: {
    path: { type: String },
    type: { type: String },
    loadedData: { type: Function }
  },
  mounted() {
  },
  methods: {
    handleLoad() {
      this.$nextTick(this.loadedData)
    }
  },
}
</script>

<style lang="scss" scoped>
.videoplayer {
  &:focus {
    outline: none;
  }
}
</style>