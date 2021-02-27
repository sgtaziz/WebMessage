<template>
  <div class="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div>
</template>

<script>

export default {
  name: "TypingIndicator",
  props: {
  },
  mounted() {
  },
  methods: {
  },
}
</script>

<style lang="scss" scoped>
.typing-indicator {
  $ti-color-bg: #3A3A3C;
  background-color: $ti-color-bg;
  will-change: transform;
  width: auto;
  border-radius: 50px;
  padding: 10px;
  display: table;
  margin: 0 auto;
  position: relative;
  animation: 2s bulge infinite ease-out;
  margin-bottom: 5px;
  margin-left: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: -2px;
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background-color: $ti-color-bg;
  }
  &::after {
    height: 5px;
    width: 5px;
    left: -5px;
    bottom: -5px;
  }
  span {
    height: 7px;
    width: 7px;
    float: left;
    margin: 0 1px;
    background-color: #9E9EA1;
    display: block;
    border-radius: 50%;
    opacity: 0.4;
    @for $i from 1 through 3 {
      &:nth-of-type(#{$i}) {
        animation: 1s blink infinite ($i * .3333s);
      }
    }
  }
}

@keyframes blink {
  50% {
    opacity: 1;
  }
}

@keyframes bulge {
  50% {
    transform: scale(1.05);
  }
}
</style>