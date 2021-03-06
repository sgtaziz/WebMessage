<template>
  <div class="expandable-image" :class="{ expanded: expanded, nostyle: $store.state.macstyle }" ref="this">
    <template v-if="loadedImage">
      <i v-if="!expanded" class="expand-button" @click="expandImage">
        <feather type="maximize-2" stroke="#fff" size="24"></feather>
      </i>
      <i v-if="!expanded" class="download-button" @click="download">
        <feather type="download" stroke="#fff" size="24"></feather>
      </i>
    </template>
    <v-lazy-image crossorigin="anonymous" :src="url" @load="handleLoad" :download="path.split('/').pop()"/>
  </div>
</template>

<script>
export default {
  props: {
    path: { type: String },
    type: { type: String },
    loadedData: { type: Function }
  },
  data () {
    return {
      expanded: false,
      loadedImage: false,
      cloned: null
    }
  },
  computed: {
    url() {
      return `${this.$store.getters.httpURI}/attachments?path=${encodeURIComponent(this.path)}&type=${encodeURIComponent(this.type)}&auth=${encodeURIComponent(this.$store.state.password)}` + (this.$store.state.transcode ? '&transcode=1' : '')
    }
  },
  mounted() {
    document.addEventListener('keydown', this.closeImage)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.closeImage)
  },
  methods: {
    closeImage (event) {
      event.stopPropagation()
      if (!this.cloned) return

      this.$nextTick(() => {
        this.cloned.style.opacity = 0
        this.cloned.removeEventListener('touchmove', this.freezeVp, false)
        this.cloned.removeEventListener('click', this.onExpandedImageClick)
        setTimeout(() => {
          this.cloned.remove()
          this.cloned = null
          this.expanded = false
        }, 250)
      })
    },
    expandImage() {
      this.expanded = true
      
      this.$nextTick(() => {
        this.cloned = this.$el.cloneNode(true)
        document.body.appendChild(this.cloned)
        $(this.cloned).addClass('expanded')
        this.cloned.addEventListener('touchmove', this.freezeVp, false)
        this.cloned.addEventListener('click', this.onExpandedImageClick)
        this.$nextTick(() => this.cloned.style.opacity = 1)
      })
    },
    freezeVp (e) {
      e.preventDefault()
    },
    onExpandedImageClick (e) {
      this.closeImage(e)
    },
    download () {
      let a = document.createElement('a')
      a.download = this.type
      a.href = this.url
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
    handleLoad () {
      this.$nextTick(this.loadedData)
      this.loadedImage = true
    }
  }
}
</script>

<style lang="scss">
.expandable-image {
  position: relative;
  transition: 0.25s opacity;

  &.nostyle {  
    border-radius: 10px;
  }
}
body > .expandable-image.expanded {
  position: fixed;
  z-index: 999999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  opacity: 0;
  padding-bottom: 0 !important;
  cursor: default;
}
body > .expandable-image.expanded > img {
  width: auto;
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  margin: 0 auto;
}
.expand-button .feather, .download-button .feather {
  filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.5));
}
.expand-button, .download-button {
  position: absolute;
  z-index: 999;
  right: 10px;
  top: 10px;
  padding: 0px;
  align-items: center;
  justify-content: center;
  padding: 3px;
  opacity: 0;
  transition: 0.2s opacity;
}
.download-button {
  top: auto;
  bottom: 10px;
}
.expandable-image:hover .expand-button, .expandable-image:hover .download-button {
  opacity: 1;
  cursor: pointer;
}
.expandable-image img {
  width: 100%;
}
</style>