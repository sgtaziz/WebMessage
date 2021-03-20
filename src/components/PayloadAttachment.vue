<template>
  <div class="URLContainer" v-if="!showNormally">
    <div class="bigImage" v-if="large && icon" @click="openURLFromImage">
      <img :src="icon" @click="showEmbed = true" @load="handleLoad" />
      <iframe v-if="embed && showEmbed" :src="embed" frameborder="0"></iframe>
      <video v-else-if="video && showEmbed" controls width="100%" @keypress.esc="escape" ref="videoPlayer">
        <source :src="video" type="video/mp4" />
        This video type is not supported.
      </video>

      <div class="playIcon" v-if="!showEmbed && (embed || video)" @click="showEmbed = true">
        <feather type="play" stroke="rgb(200,200,200)" size="24"></feather>
      </div>
    </div>
    <div
      class="URLInfo"
      :class="{
        large: large,
      }"
      @click="openURL"
    >
      <div class="URLText">
        <div class="URLTitle" v-if="title">
          {{ title }}
        </div>
        <div class="URLSubtitle">
          {{ subtitle }}
        </div>
      </div>
      <div class="URLIcon">
        <img v-if="!large && icon" :src="icon" @load="handleLoad" />
        <feather v-else type="chevron-right" stroke="#A7A7A7" size="16"></feather>
      </div>
    </div>
  </div>
  <div class="URLContainer normally" v-else>
    {{ link }}
  </div>
</template>

<script>
import { remote } from 'electron'

export default {
  name: 'PayloadAttachment',
  props: {
    loadedData: {
      type: Function,
    },
    payloadData: {
      type: Object,
    },
    date: {
      type: Number,
    },
  },
  emits: ['refreshRequest'],
  data() {
    return {
      icon: null,
      title: null,
      subtitle: null,
      large: false,
      embed: null,
      link: '',
      showEmbed: false,
      video: null,
      showNormally: false,
    }
  },
  watch: {
    payloadData() {
      this.populateValues()
    },
  },
  mounted() {
    this.populateValues()
  },
  methods: {
    populateValues() {
      this.icon = this.payloadData.LPIconMetadata ? this.payloadData.LPIconMetadata[0] : null
      // if (!this.icon) this.icon = this.payloadData.RichLinkImageAttachmentSubstitute ? this.payloadData.RichLinkImageAttachmentSubstitute[0] : null

      this.large =
        this.payloadData.LPImageMetadata != null || (this.payloadData.LPIconMetadata && this.payloadData.LPIconMetadata[1] != '{0, 0}')
      this.title = this.payloadData.NSURL ? this.payloadData.NSURL[1] : null
      this.subtitle = this.payloadData.root[0]
        .replace('http://', '')
        .replace('https://', '')
        .replace('www.', '')
        .split('/')[0]
        .toLowerCase()
      this.embed =
        this.payloadData.LPImageMetadata && this.payloadData.LPVideo && this.payloadData.LPVideo[0] == 'text/html'
          ? this.payloadData.LPImageMetadata[0]
          : null
      this.link = this.payloadData.root[0]
      this.video = this.payloadData.RichLinkVideoAttachmentSubstitute ? this.payloadData.RichLinkVideoAttachmentSubstitute[0] : null

      if (this.title && this.title.length > 82) {
        this.title = this.title.substring(0, 82).trim() + ' ...'
      }

      if (!this.title && this.payloadData.LPArtworkMetadata) {
        this.title = this.payloadData.NSURL[0]
        this.large = this.payloadData.RichLinkImageAttachmentSubstitute && this.payloadData.RichLinkImageAttachmentSubstitute[4] != null
        this.icon = this.payloadData.RichLinkImageAttachmentSubstitute ? this.payloadData.RichLinkImageAttachmentSubstitute[4] : ''
      }

      if (!this.title) {
        // 15 seconds with no data, bad
        if (Date.now() - this.date >= 15000) {
          this.showNormally = true
        } else {
          setTimeout(() => {
            this.$emit('refreshRequest')
          }, 1000)
        }
      }
    },
    openURL() {
      remote.shell.openExternal(this.link)
    },
    openURLFromImage() {
      if (this.embed || this.video) return
      this.openURL()
    },
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
.URLContainer {
  border-radius: 14px;
  cursor: pointer;

  .bigImage {
    border-radius: 14px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    overflow: hidden;
    width: fit-content;
    position: relative;

    img {
      max-width: 100%;
      border-radius: 14px;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    iframe,
    video {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: black;
    }

    video {
      &:focus {
        outline: none;
      }
    }

    .playIcon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateY(-50%) translateX(-50%);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(25, 25, 25, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;

      >>> .feather {
        margin-left: 1px;
      }
    }
  }

  .URLInfo {
    background: #3b3b3d;
    border-radius: 14px;
    padding: 8px 15px;
    padding-right: 10px;
    display: flex;
    flex-direction: row;
    flex-grow: 1;

    &.large {
      max-width: fit-content;
    }

    .URLText {
      display: inline-flex;
      flex-direction: column;
      margin-right: 10px;

      .URLTitle {
        font-weight: 500;
        margin-bottom: 2px;
      }
      .URLSubtitle {
        color: #a7a7a7;
      }
    }

    .URLIcon {
      display: inline-flex;
      flex: 1;
      align-items: center;
      justify-content: flex-end;
      float: right;

      img {
        width: 32px;
      }
    }
  }

  &.normally {
    color: #2284ff;
    text-decoration: underline;
    padding: 6px 10px;
  }
}
</style>
