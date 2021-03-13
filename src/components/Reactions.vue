<template>
  <transition name="slide-fade" mode="out-in">
    <div class="reactions" v-if="reactionList.length > 0" :class="{ left: !targetFromMe }">
      <div v-for="(reaction, i) in reactionList" @click="click" :key="reaction.guid"
        class="bubble" :class="{ isMe: reaction.sender == 1 }"
        :style="{
          zIndex: 4-i, top: position.top+'px',
          left: position.left ? ((position.left+(targetFromMe ? (-i*3) : (i*3)))+'px') : null,
          right: position.right ? ((position.right+(targetFromMe ? (i*3) : (-i*3)))+'px') : null
        }">
        <font-awesome-icon v-if="reaction.icon && reaction.icon.name != 'exclamation'" :icon="reaction.icon.name" size="lg" :style="reaction.icon.style" />
        <font-awesome-layers v-else-if="reaction.icon.name == 'exclamation'" class="fa-1x">
          <font-awesome-icon :icon="reaction.icon.name" size="1x" transform="left-3 down-1 shrink-1 rotate-355" />
          <font-awesome-icon :icon="reaction.icon.name" size="1x" transform="right-3 rotate-4" />
        </font-awesome-layers>
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
    part: { type: Number },
    click: { type: Function },
    balloon: { type: Boolean, default: false },
  },
  computed: {
    reactionList() {
      if (!this.reactions) return []
      let reactions = this.reactions.filter(reaction => reaction.reactionType >= 2000 && reaction.reactionType < 3000 && reaction.forPart == (this.balloon ? 'b' : this.part))
      
      let reactionFromMe = null
      reactions.forEach((reaction) => {
        let reactionId = reaction.reactionType
        let icon = this.icons.find(icon => icon.id == reactionId)
        reaction.icon = icon
        // if (reaction.sender == 1) reactionFromMe = reaction
      })

      return (reactionFromMe ? reactions.slice(0, 3) : reactions.slice(0, 4)).sort((a, b) => (b.date - a.date > 0 ? 1 : -1))
    }
  },
  watch: {
    reactions(newVal) {
      this.$nextTick(this.adjustPostion())
    }
  },
  data() {
    return {
      icons: [
        { name: 'heart', id: 2000, style: { color: '#FA5C99' } },
        { name: 'thumbs-up', id: 2001 },
        { name: 'thumbs-down', id: 2002, style: { transform: 'scaleX(-1)'} },
        { name: 'laugh-squint', id: 2003 },
        { name: 'exclamation', id: 2004 },
        { name: 'question', id: 2005 },
      ],
      position: { top: 3, left: 0 }
    }
  },
  mounted() {
    this.$nextTick(this.adjustPostion())
    setTimeout(this.adjustPostion(), 10) //i hate racey bois
    window.addEventListener('resize', this.adjustPostion())
  },
  beforeMount () {
    this.adjustPostion()
  },
  methods: {
    adjustPostion () {
      this.position.left = null
      this.position.right = -18
      if (this.targetFromMe) {
        this.position.right = null
        this.position.left = -18
      }
    }
  },
}
</script>

<style lang="scss" scoped>
.reactions {
  position: relative;
  // margin-top: 18px;
  height: 18px;
  width: 100%;

  &.left {
    .bubble {
      &::before, &::after {
        right: 0px;
        left: auto;
      }
      &::after {
        right: -4px;
      }
    }
  }

  .bubble {
    background-color: #3A3A3C;
    padding: 6px;
    position: absolute;
    border: solid 1px #1D1D1D;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    line-height: 12px;
    // transition: 0.3s;

    &::before {
      content: " ";
      width: 8px;
      height: 8px;
      background-color: #3A3A3C;
      border-radius: 50%;
      position: absolute;
      bottom: -1px;
      left: 0px;
    }

    &::after {
      content: " ";
      width: 4px;
      height: 4px;
      background-color: #3A3A3C;
      border-radius: 50%;
      position: absolute;
      bottom: -4px;
      left: -4px;
    }

    svg {
      width: 100%;
      height: 100%;
    }

    .fa-layers {
      height: 1.1em;
      width: 1.1em;
    }

    &.isMe {
      background-color: #1287FF;

      &::before, &::after {
        background-color: #1287FF;
      }
    }
  }
}

.slide-fade-enter-active {
  transition: all .2s ease;
}
.slide-fade-leave-active {
  transition: all .2s ease;
}
.slide-fade-enter, .slide-fade-leave-to {
  transform: scaleY(0);
  margin-top: 0px;
  height: 0px;
  opacity: 0;
}
</style>