// Forked from eliep/vue-avatar

<template>
  <div class="vue-avatar--wrapper" :style="[style, customStyle]" aria-hidden="true">
    <!-- this img is not displayed; it is used to detect failure-to-load of div background image -->
    <img v-if="this.isImage" class='avatar' :src="this.src" @error="onImgError"/>
    <span v-show="!this.isImage">{{ userInitial }}</span>
  </div>
</template>

<script>
const getInitials = (username) => {
  let parts = username.split(/[ -]/)
  let initials = ''
  for (var i = 0; i < parts.length; i++) {
    initials += parts[i].charAt(0)
  }
  if (initials.length > 3 && initials.search(/[A-Z]/) !== -1) {
    initials = initials.replace(/[a-z]+/g, '')
  }
  initials = initials.substr(0, 3).toUpperCase()
  return initials
}
export default {
  name: 'avatar',
  props: {
    username: {
      type: String
    },
    initials: {
      type: String
    },
    color: {
      type: String
    },
    customStyle: {
      type: Object
    },
    inline: {
      type: Boolean
    },
    size: {
      type: Number,
      default: 50
    },
    src: {
      type: String
    },
    rounded: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      imgError: false
    }
  },
  mounted () {
    if (!this.isImage) {
      this.$emit('avatar-initials', this.username, this.userInitial)
    }
  },
  computed: {
    isImage () {
      return !this.imgError && Boolean(this.src)
    },
    style () {
      const style = {
        display: this.inline ? 'inline-flex' : 'flex',
        width: `${this.size}px`,
        height: `${this.size}px`,
        borderRadius: this.rounded ? '50%' : 0,
        lineHeight: `${(this.size + Math.floor(this.size / 20)) - 1}px`,
        fontWeight: '500',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        userSelect: 'none',
        background: 'linear-gradient(#6C6C6C, #474747)'
      }
      
      return style
    },
    userInitial () {
      if (!this.isImage) {
        const regex = /<% RGI_Emoji %>|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}/gu
        const variationSelector = /[\u180B-\u180D\uFE00-\uFE0F]|\uDB40[\uDD00-\uDDEF]/gu

        let cleanName = this.username.replace(regex, '').replace(variationSelector, '').trim()

        if (cleanName.includes(',')) {
          cleanName = cleanName.replace(' ', '')
          cleanName = cleanName.replace(',', ' ')
        }
        
        return getInitials(cleanName).substring(0, 2)
      }
      return ''
    }
  },
  methods: {
    initial: getInitials,
    onImgError (evt) {
      this.imgError = true
    }
  }
}
</script>