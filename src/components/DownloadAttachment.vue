<template>
  <div class="downloadContainer" @click="download">
    <span class="file">
      <span class="filename">{{ filename }}</span
      >.<span class="extension">{{ extension }}</span>
    </span>
    <feather type="download" stroke="#c2c2c2" size="20"></feather>
  </div>
</template>

<script>
export default {
  props: {
    path: {
      type: String,
    },
    type: {
      type: String,
    },
  },
  data() {
    return {}
  },
  computed: {
    url() {
      return `${this.$store.getters.httpURI}/attachments?path=${encodeURIComponent(this.path)}&type=${encodeURIComponent(
        this.type
      )}&auth=${encodeURIComponent(this.$store.state.password)}`
    },
    file() {
      return this.path.split('/').pop()
    },
    filename() {
      return this.path
        .split('/')
        .pop()
        .split('.')
        .slice(0, -1)
        .join('.')
    },
    extension() {
      return this.path
        .split('/')
        .pop()
        .split('.')
        .pop()
    },
  },
  methods: {
    download() {
      const a = document.createElement('a')
      a.download = this.type
      a.href = this.url
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
  },
}
</script>

<style lang="scss">
.downloadContainer {
  border-radius: 10px;
  padding: 10px 10px;
  color: lighten(#c2c2c2, 20%);
  max-width: 100%;
  width: auto;
  background-color: #3a3a3c;
  position: relative;
  overflow-wrap: break-word;

  .feather {
    float: right;
  }

  &:hover {
    cursor: pointer;

    .feather {
      stroke: lighten(#c2c2c2, 20%);
    }
  }

  .file {
    display: inline-block;
    vertical-align: middle;
    font-size: 14px;
    width: calc(100% - 20px);
    max-width: calc(100% - 20px);
    text-decoration: underline;

    .filename {
      display: inline-block;
      max-width: calc(100% - 33px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: underline;
      vertical-align: top;
    }

    .extension {
      display: inline-block;
      width: 24px;
      text-decoration: underline;
      vertical-align: top;
    }
  }
}
</style>
