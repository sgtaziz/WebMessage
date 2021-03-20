<template>
  <video
    class="videoplayer"
    controls
    width="100%"
    @canplay="handleLoad"
    @canplaythrough="handleLoad"
    @loadeddata="handleLoad"
    @keypress.esc="escape"
    ref="videoPlayer"
  >
    <source
      :src="
        `${$store.getters.httpURI}/attachments?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}&auth=${encodeURIComponent(
          $store.state.password
        )}` + ($store.state.transcode ? '&transcode=1' : '')
      "
      :type="type"
    />
    <source
      :src="
        `${$store.getters.httpURI}/attachments?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}&auth=${encodeURIComponent(
          $store.state.password
        )}` + ($store.state.transcode ? '&transcode=1' : '')
      "
      type="video/mp4"
    />
    <source
      :src="
        `${$store.getters.httpURI}/attachments?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}&auth=${encodeURIComponent(
          $store.state.password
        )}` + ($store.state.transcode ? '&transcode=1' : '')
      "
      type="video/ogg"
    />
    This video type is not supported.
  </video>
</template>

<script>
export default {
  name: 'VideoPlayer',
  props: {
    path: {
      type: String,
    },
    type: {
      type: String,
    },
    loadedData: {
      type: Function,
    },
  },
  mounted() {
    document.addEventListener('keydown', this.escape)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.escape)
  },
  methods: {
    handleLoad() {
      this.$nextTick(this.loadedData)
    },
    escape(e) {
      if (e.key == 'Escape' && this.$refs.videoPlayer && document.fullscreenElement !== null) {
        document.exitFullscreen()
      }
    },
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
