<template>
  <transition name="fade" mode="out-in">
    <div id="reactionMenu" v-if="target">
      <div class="backdrop" @click="closeMenu">
      </div>
      <div class="menu" :style="{ top: position.top, left: position.left, right: position.right, bottom: position.bottom }" :class=" direction ">
        <template v-for="icon in icons">
          <font-awesome-icon v-if="icon.name != 'exclamation'" :key="icon.name" @click="sendReaction(icon)" :icon="icon.name" :class="{ active: activeReactions.includes(icon.id) }" :style="icon.style" size="lg" />
          <font-awesome-layers v-else class="fa-lg" :key="icon.name" @click="sendReaction(icon)" :class="{ active: activeReactions.includes(icon.id) }">
            <font-awesome-icon :icon="icon.name" size="lg" transform="left-3 down-1 shrink-1 rotate-355" />
            <font-awesome-icon :icon="icon.name" size="lg" transform="right-3 rotate-4" />
          </font-awesome-layers>
        </template>
        
        
      </div>
    </div>
  </transition>
</template>

<script>

export default {
  name: "ReactionMenu",
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
      position: { top: '50px', left: '20px' },
      direction: 'right',
      clone: null,
      activeReactions: []
    }
  },
  props: {
    target: { type: Object },
    guid: { type: String },
    part: { type: Number },
    reactions: { type: Array },
    balloon: { type: Boolean, default: false }
  },
  watch: {
    target(newTarget) {
      if (newTarget != null) {
        this.adjustPostion()
        window.removeEventListener('resize', this.adjustPostion)
        window.addEventListener('resize', this.adjustPostion)
      } else {
        this.activeReactions = []
      }
    }
  },
  methods: {
    adjustPostion () {
      let newTarget = this.target
      if (newTarget == null) return

      let target = newTarget.children().last()
      let parent = newTarget.parent().parent().parent()
      let p = target.offset()
      let w = target.width()
      let h = target.height()
      let clone = target.parent().clone()

      clone.css({
        position: 'fixed',
        top: p.top+'px',
        left: p.left+'px',
        width: target.parent().width()+'px',
        height: target.parent().height()+'px',
        margin: '0'
      })

      let reactionsBubble = clone.find('.reactions')
      if (reactionsBubble) reactionsBubble.remove()

      let msgWrapper = $('<div class="messages" style="display:contents;z-index:-1;"></div>')
      $('<div></div>').attr('class', parent.attr('class')).appendTo(msgWrapper)
      clone.appendTo(msgWrapper.children().first())
      this.$nextTick(() => {
        msgWrapper.appendTo('#reactionMenu')
      })

      if (this.clone) {
        this.clone.remove()
        this.clone = null
      }
      this.clone = msgWrapper
      this.direction = parent.hasClass('send') ? 'right' : 'left'
      
      this.position = { }
      this.position.top = (p.top - 45) + 'px'
      if (this.direction == 'right') {
        this.position.right = 6 + 'px'
      } else {
        this.position.left = (p.left - 15) + 'px'
      }

      let activeReactionsList = this.reactions.filter(reaction => reaction.reactionType >= 2000 && reaction.reactionType < 3000 && reaction.sender == 1 && reaction.forPart == (this.balloon ? 'b' : this.part))
      this.activeReactions = []
      activeReactionsList.forEach((reaction) => {
        this.activeReactions.push(reaction.reactionType)
      })
    },
    sendReaction (icon) {
      let id = icon.id
      if (this.activeReactions.includes(id)) id += 1000 //Remove reaction
      this.$emit('sendReaction', id, this.guid, this.part)
      this.closeMenu()
    },
    closeMenu () {
      setTimeout(() => {
        if (this.clone) {
          this.clone.remove()
          this.clone = null
          this.activeReactions = []
        }
      }, 200)

      this.$emit('close')
    }
  },
  socket: {
    newMessage () {
      this.$nextTick(() => {
        this.adjustPostion()
      })
    },
    setTypingIndicator () {
      this.$nextTick(() => {
        this.adjustPostion()
      })
    }
  }
}
</script>

<style lang="scss">
#reactionMenu {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;

  .message.last:after {
    background: #090909;
  }

  .backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: -1;
  }

  .menu {
    position: fixed;
    background-color: rgb(70,70,70);
    padding: 5px 10px;
    border-radius: 20px;
    color: rgb(140,140,140);
    z-index: 1;

    & > svg {
      padding: 8px;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      vertical-align: middle;
      cursor: pointer;

      &:hover {
        background-color: rgba(0,0,0,0.2);
      }

      &.active {
        background-color: #2484FF;
        color: white;
      }
    }

    .fa-layers {
      padding: 8px;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      vertical-align: middle;
      cursor: pointer;

      & > svg {
        width: 0.7em;
        height: 0.7em;
      }

      &:hover {
        background-color: rgba(0,0,0,0.2);
      }

      &.active {
        background-color: #2484FF;
        color: white;
      }
    }

    &:after {
      content: "";
      position: absolute;
      bottom: -5px;
      right: 11px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgb(70,70,70);
    }

    &:before {
      content: "";
      position: absolute;
      bottom: -11px;
      right: 9px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgb(70,70,70);
    }

    &.left {
      &:after {
        left: 11px;
        right: unset;
      }

      &:before {
        left: 9px;
        right: unset;
      }
    }
  }
}
</style>