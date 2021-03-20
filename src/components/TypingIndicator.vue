<template>
  <div class="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div>
</template>

<script>
export default {
  name: 'TypingIndicator',
  props: {},
  mounted() {},
  methods: {},
}
</script>

<style lang="scss">
.typing-indicator {
  $ti-color-bg: #3a3a3c;
  background-color: $ti-color-bg;
  will-change: transform;
  width: auto;
  border-radius: 50px;
  padding: 10px;
  display: table;
  margin: 0 auto;
  margin-top: 1px;
  position: relative;
  animation: 2s bulge infinite 0.3333s;
  margin-bottom: 7px;
  margin-left: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: -1px;
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background-color: $ti-color-bg;
    animation: 2s bulge infinite 0.6666s;
  }
  &::after {
    height: 5px;
    width: 5px;
    left: -4.5px;
    bottom: -6px;
    animation: 2s bulge infinite 1s;
  }
  span {
    height: 7px;
    width: 7px;
    float: left;
    margin: 0 1px;
    background-color: #9e9ea1;
    display: block;
    border-radius: 50%;
    opacity: 0.4;
    @for $i from 1 through 3 {
      &:nth-of-type(#{$i}) {
        animation: 1s blink infinite ($i * 0.3333s);
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
