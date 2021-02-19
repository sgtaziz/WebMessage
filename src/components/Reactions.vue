<template>
  <transition name="slide-fade" mode="out-in">
    <div class="reactions" v-if="reactionList.length > 0" :class="{ left: !targetFromMe }">
      <div v-for="(reaction, i) in reactionList" @click="click" :key="reaction.guid" class="bubble" :class="{ isMe: reaction.sender == 1 }" :style="{ zIndex: 4-i, top: position.top+'px', left: (position.left+(targetFromMe ? (-i*3) : (i*3)))+'px', right: position.right + 'px' }">
        <font-awesome-icon v-if="reaction.icon" :icon="reaction.icon.name" size="lg" :style="reaction.icon.style" />
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "Reactions",
  props: {
    reactions: { type: Array },
    targetFromMe: { type: Boolean },
    target: { type: String },
    click: { type: Function }
  },
  computed: {
    reactionList() {
      let reactions = this.reactions.filter(reaction => reaction.reactionType >= 2000 && reaction.reactionType < 3000)
      reactions.forEach((reaction) => {
        let reactionId = reaction.reactionType
        let icon = this.icons.find(icon => icon.id == reactionId)
        reaction.icon = icon
      })

      return reactions.sort((a, b) => b.sender - a.sender).slice(0, 4)
    }
  },
  watch: {
  },
  data() {
    return {
      icons: [
        { name: 'heart', id: 2000, style: { color: '#FA5E96' } },
        { name: 'thumbs-up', id: 2001 },
        { name: 'thumbs-down', id: 2002 },
        { name: 'laugh-squint', id: 2003 },
        { name: 'exclamation', id: 2004 },
        { name: 'question', id: 2005 },
      ],
      position: { top: -16, left: 0 }
    }
  },
  mounted() {
    this.$nextTick(this.adjustPostion())
    window.addEventListener('resize', (e) => {
      this.adjustPostion()
    })
  },
  beforeMount () {
    this.adjustPostion()
  },
  methods: {
    adjustPostion () {
      let target = $(this.target).children().last()
      let padding = (target.css('padding-left') ? target.css('padding-left') : '0px').replace('px', '')

      this.position.left = (target.width() - 12 + (padding * 2))
      if (this.targetFromMe) {
        this.position.left = (-target.width() - 16 - (padding * 2))
      }
    }
  },
}
</script>

<style lang="scss" scoped>
.reactions {
  position: relative;
  margin-top: 18px;

  .bubble {
    background-color: #3A3A3C;
    padding: 5px;
    position: absolute;
    border: solid 1px #1D1D1D;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    line-height: 12px;
    // transition: 0.3s;

    svg {
      width: 100%;
      height: 100%;
    }

    &.isMe {
      background-color: #2284FF;
    }
  }
}

.slide-fade-enter-active {
  transition: all .3s ease;
}
.slide-fade-leave-active {
  transition: all .3s ease;
}
.slide-fade-enter, .slide-fade-leave-to {
  transform: scaleY(0);
  margin-top: 0px;
  opacity: 0;
}
</style>