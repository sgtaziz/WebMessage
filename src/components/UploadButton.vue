<template>
  <div class="uploadButtonContainer" @click="clicked">
    <feather type="paperclip" fill="rgb(152,152,152)" stroke="rgb(29,29,29)" size="26"></feather>
    <div class="progressContainer" v-if="isReading">
      <div class="progress" :style="`width:${progress}%;`"></div>
    </div>
    <input ref="fileInput" type="file" style="visibility:hidden;width:0;height:0;" :accept="acceptedTypes" multiple @change="filesChanged" />
  </div>
</template>

<script>
export default {
  name: "UploadButton",
  props: {
    enableiMessageAttachments: { type: Boolean, default: false },
  },
  data() {
    return {
      attachments: null,
      progress: 0,
      isReading: false
    }
  },
  computed: {
    acceptedTypes() {
      let types = 'image/*,video/*'
      if (this.enableiMessageAttachments) types = types + ',application/*,text/plain'
      return types
    }
  },
  methods: {
    clicked() {
      this.$refs.fileInput.click()
    },
    remove(i) {
      this.attachments.splice(i, 1)
      if (this.attachments.length == 0) this.attachments = null
      this.$emit('filesChanged')
    },
    clear() {
      this.isReading = false
      this.attachments = null
      this.$refs.fileInput.value = ''
      this.progress = 0
      this.$emit('filesChanged')
    },
    async filesChanged(e) {
      let attachments = []
      let totalSize = 0
      this.progress = 0
      this.isReading = true
      
      for (let i = 0; i < e.target.files.length; i++) {
        let attachment = {}
        let file = e.target.files[i]
        
        totalSize += file.size
        attachment.name = file.name
        attachment.data = await this.readFileData(file).catch(e => {
          alert("An error occured while parsing file: '"+file.name+"'\n"+e)
          this.progress = null
          this.attachments = null
          return
        })

        attachments.push(attachment)
        this.progress = Math.round((attachments.length/e.target.files.length)*100)
      }

      if (totalSize > 7.5e7) {
        alert('Attachments size cannot be larger than 75MB.')
        this.attachments = null
        return
      }

      if (attachments.length == 0) this.attachments = null
      else this.attachments = attachments

      setTimeout(() => {
        this.isReading = false
      }, 1500)

      this.$emit('filesChanged')
      this.$refs.fileInput.value = ''
    },
    async readFileData (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result.split('base64,').pop())
        reader.onerror = error => reject(error)
      })
    }
  },
}
</script>

<style lang="scss">
.uploadButtonContainer {
  width: 26px;
  height: 26px;
  float: right;

  .progressContainer {
    width: 100%;
    height: 2px;
    border: 1px solid #545454;
    margin-top: -4px;
    border-radius: 2px;

    .progress {
      background: #2284FF;
      width: 0%;
      height: 100%;
      -webkit-transition: width 1s ease-in-out;
      -moz-transition: width 1s ease-in-out;
      -o-transition: width 1s ease-in-out;
      transition: width 1s ease-in-out;
    }
  }
}
</style>