<template>
  <audio class="audioplayer" controls width="100%" @canplay="handleLoad" @canplaythrough="handleLoad" @loadeddata="handleLoad"
    :src="`${$store.getters.httpURI}/attachments?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}&auth=${encodeURIComponent($store.state.password)}` + ($store.state.transcode ? '&transcode=1' : '')"
  />
</template>

<script>

export default {
  name: "AudioPlayer",
  props: {
    path: { type: String },
    type: { type: String },
    loadedData: { type: Function }
  },
  methods: {
    handleLoad() {
      this.$nextTick(this.loadedData)
    }
  },
}
</script>

<style lang="scss" scoped>
.audioplayer {
  &:focus {
    outline: none;
  }
}
</style>