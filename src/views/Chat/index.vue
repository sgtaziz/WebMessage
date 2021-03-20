<template>
  <transition name="fade" mode="out-in">
    <div class="messageContainer" ref="messageContainer" :key="$route.params.id">
      <div class="titlebar">
        <div class="receiverContainer">
          <span class="label">To:</span>
          <span
            class="contact"
            v-if="messages && messages.state && messages.state.messages[0] && $route.params.id != 'new'"
            v-html="$filters.nativeEmoji(messages.state.messages[0].name)"
          ></span>
          <span class="contact" v-else-if="$route.params.id == 'new'" style="overflow: visible;">
            <autocomplete ref="autoComplete" :search="search" :get-result-value="getResultValue" @submit="onSubmit"></autocomplete>
          </span>
        </div>
        <div class="closeBtn" @click="$router.push('/')">
          <feather type="x-circle" stroke="rgba(255,255,255,0.6)" size="16"></feather>
        </div>
      </div>

      <div
        v-if="
          (!messages || !messages.state || !messages.state.messages || messages.state.messages.length == 0) && $route.params.id != 'new'
        "
        style="height:100%;padding:14px;"
      >
        <img src="@/assets/loading.webp" style="height:18px;" />
      </div>
      <template v-else-if="$route.params.id != 'new' || messages.state.receiver != ''">
        <reactionMenu
          :target="reactions.state.reactingMessage"
          :reactions="reactions.state.reactingMessageReactions"
          :guid="reactions.state.reactingMessageGUID"
          :part="reactions.state.reactingMessagePart"
          :balloon="reactions.state.reactingToBalloon"
          @close="reactions.closeReactionMenu"
          @sendReaction="reactions.sendReaction"
        ></reactionMenu>
        <div class="messages scrollable" ref="messagesContainer">
          <div v-for="(msg, i) in messages.sortedMessages.value" :key="'msg' + msg.id">
            <div class="timegroup" v-html="messages.dateGroup(i - 1, i)" v-if="messages.dateGroup(i - 1, i) != ''"></div>
            <div v-if="msg.group && msg.sender != 1" class="senderName" v-html="$filters.nativeEmoji(msg.author)"></div>

            <div
              :ref="'msg' + msg.id"
              :class="(msg.sender == 1 ? 'send ' : 'receive ') + msg.type + (messages.sortedMessages.value.length - 1 == i ? ' last' : '')"
              class="messageGroup"
            >
              <div class="authorAvatar" v-if="msg.group && msg.sender != 1">
                <avatar
                  :username="msg.author"
                  :size="28"
                  inline
                  :customStyle="{ fontSize: '10px', fontWeight: '400' }"
                  :src="`${$store.getters.httpURI}/contactimg?docid=${msg.authorDocid}&auth=${encodeURIComponent($store.state.password)}`"
                />
              </div>

              <div class="groupWrapper">
                <template v-for="(text, ii) in msg.texts" :key="'wrapper' + ii">
                  <div :id="'msg' + msg.id + '-text' + ii" class="textWrapper">
                    <div
                      v-for="(attachment, index) in text.attachments"
                      :key="`${ii}-${index}`"
                      class="attachment"
                      :id="'msg' + msg.id + '-text' + ii + '-part' + index"
                      @mousedown.left="reactions.startInterval(msg.id, ii, text.guid, text.reactions, index)"
                      @mouseup.left="reactions.stopInterval"
                      @mouseleave="reactions.stopInterval"
                      @mousemove="reactions.stopIntervalWhen"
                      @click.right="
                        functions.rightClickMessage({
                          id: msg.id,
                          ii,
                          guid: text.guid,
                          reactions: JSON.parse(JSON.stringify(text.reactions)),
                          part: index,
                        })
                      "
                    >
                      <reaction-bubbles
                        :click="() => reactions.openReactionMenu(msg.id, ii, text.guid, text.reactions, index)"
                        :target="'#msg' + msg.id + '-text' + ii"
                        :part="index"
                        :reactions="text.reactions"
                        :targetFromMe="msg.sender == 1"
                      />
                      <template v-if="attachment[0] != '' && !attachment[0].endsWith('.pluginPayloadAttachment')">
                        <expandable-image
                          v-if="functions.isImage(attachment[1])"
                          :loadedData="functions.attachmentLoaded"
                          :path="attachment[0]"
                          :type="attachment[1]"
                          :guid="`image-${i}-${ii}-${index}`"
                        />
                        <video-player
                          v-else-if="functions.isVideo(attachment[1])"
                          :loadedData="functions.attachmentLoaded"
                          :path="attachment[0]"
                          :type="attachment[1]"
                        />
                        <audio-player
                          v-else-if="functions.isAudio(attachment[0])"
                          :loadedData="functions.attachmentLoaded"
                          :path="attachment[0]"
                          :type="attachment[1]"
                        />
                        <download-attachment v-else :path="attachment[0]" :type="attachment[1]" />
                      </template>
                    </div>

                    <div
                      v-if="$filters.nativeEmoji(text.text) != '' || text.undisplayable"
                      :id="'msg' + msg.id + '-text' + ii + '-part' + text.attachments.length"
                      class="bubbleWrapper"
                    >
                      <reaction-bubbles
                        :click="
                          () => reactions.openReactionMenu(msg.id, ii, text.guid, text.reactions, text.attachments.length, text.balloon)
                        "
                        :target="'#msg' + msg.id + '-text' + ii"
                        :part="text.attachments.length"
                        :reactions="text.reactions"
                        :targetFromMe="msg.sender == 1"
                        :balloon="text.balloon"
                      />
                      <div
                        class="message"
                        @mousedown.left="
                          reactions.startInterval(msg.id, ii, text.guid, text.reactions, text.attachments.length, text.balloon)
                        "
                        @mouseup.left="reactions.stopInterval"
                        @mouseleave="reactions.stopInterval"
                        @mousemove="reactions.stopIntervalWhen"
                        @click.right="
                          functions.rightClickMessage({
                            id: msg.id,
                            ii,
                            guid: text.guid,
                            reactions: JSON.parse(JSON.stringify(text.reactions)),
                            part: text.attachments.length,
                            balloon: text.balloon,
                          })
                        "
                        :key="'msg' + msg.id + '-text' + ii"
                        :class="{
                          last: msg.texts.length - 1 == ii,
                          jumbo: functions.isEmojis(text.text),
                          payload: text.undisplayable || text.payload,
                        }"
                        :style="msg.sender == 1 && text.showStamp && (text.read > 0 || text.delivered > 0) ? 'margin-bottom: 0px;' : ''"
                      >
                        <div class="subject" v-if="text.subject && text.subject != ''" v-html="$filters.nativeEmoji(text.subject)"></div>

                        <span
                          style="white-space: pre-wrap;"
                          v-if="!text.undisplayable && !text.payload"
                          v-html="$filters.nativeEmoji(text.text)"
                          v-linkified
                        ></span>
                        <payload-attachment
                          v-else-if="!text.undisplayable && text.payload"
                          :payloadData="text.payload"
                          :loadedData="functions.attachmentLoaded"
                          :date="msg.date"
                          @refreshRequest="messages.reloadMessage(text.guid)"
                        />
                        <unsupported-message v-else />
                      </div>
                    </div>

                    <div
                      class="receipt"
                      :key="'msg' + msg.id + '-text' + ii + '-receipt'"
                      v-if="msg.sender == 1 && text.showStamp && (text.read > 0 || text.delivered > 0)"
                    >
                      <span class="type">{{ text.read > 0 ? 'Read' : 'Delivered' }}</span>
                      {{ messages.humanReadableTimestamp(text.read > 0 ? text.read : text.delivered) }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="messageGroup receive last" v-if="$store.state.isTyping[$route.params.id]">
            <div class="textWrapper">
              <typing-indicator />
            </div>
          </div>
        </div>

        <div class="textboxContainer">
          <div class="attachmentPreview" v-if="input.state.hasAttachments">
            <div class="attachment" v-for="(attachment, i) in $refs.uploadButton.attachments" :key="i">
              <div class="removeAttachment" @click="input.removeAttachment(i)">
                <feather type="x-circle" fill="rgb(152,152,152)" stroke="rgb(29,29,29)" size="16"></feather>
              </div>
              {{ attachment.name }}
            </div>
          </div>
          <div
            class="subjectInput"
            ref="subjectInput"
            id="subjectInput"
            v-if="$store.state.subjectLine"
            placeholder="Subject"
            :class="{ noTopBorder: input.state.hasAttachments }"
            @blur="input.handleBlur"
            @input="input.messageInputChanged"
            @paste="input.messageInputPasted"
            @keydown.enter.exact="input.enterKey"
            @keydown.shift.enter="input.shiftEnterKey"
            contenteditable
          ></div>
          <div class="msgTextboxWrapper">
            <img src="@/assets/loading.webp" class="uploadButtonContainer" style="height:24px;float:right;" v-if="!input.state.canSend" />
            <upload-button
              v-show="input.state.canSend"
              ref="uploadButton"
              :enableiMessageAttachments="messages.state.messages[0] && messages.state.messages[0].type == 'iMessage'"
              @filesChanged="input.previewFiles"
            />

            <div
              class="messageInput"
              ref="messageInput"
              id="messageInput"
              :placeholder="messages.state.messages[0] ? messages.state.messages[0].type.replace('SMS', 'Text Message') : 'Send a message'"
              :class="{
                noTopBorder: input.state.hasAttachments || $store.state.subjectLine,
              }"
              @blur="input.handleBlur"
              @input="input.messageInputChanged"
              @paste="input.messageInputPasted"
              @keydown.enter.exact="input.enterKey"
              @keydown.shift.enter="input.shiftEnterKey"
              contenteditable
            ></div>
            <div
              class="sendBtn"
              :class="{
                cantSend: !input.state.canSend || !input.state.hasDataToSend,
                SMS: messages.state.messages[0] && messages.state.messages[0].type == 'SMS',
              }"
              @click="input.sendText"
            >
              <feather type="arrow-up" size="18"></feather>
            </div>
            <div class="emojiBtn">
              <transition name="fade" mode="out-in">
                <picker
                  :data="input.state.emojiIndex"
                  v-if="input.state.showEmojiMenu"
                  v-click-outside="input.hideEmojiMenu"
                  ref="EmojiPicker"
                  :class="{ visible: input.state.showEmojiMenu }"
                  :set="$store.state.emojiSet.toLowerCase()"
                  :native="$store.state.emojiSet == 'Native'"
                  @select="input.insertEmoji"
                />
              </transition>
              <feather type="smile" fill="rgb(152,152,152)" stroke="rgb(29,29,29)" size="26" @click="input.toggleEmojiMenu"></feather>
            </div>
          </div>
        </div>
      </template>
    </div>
  </transition>
</template>

<script lang="ts">
import Autocomplete from '@trevoreyre/autocomplete-vue'
import VideoPlayer from '@/components/VideoPlayer'
import ExpandableImage from '@/components/ExpandableImage'
import DownloadAttachment from '@/components/DownloadAttachment'
import UploadButton from '@/components/UploadButton'
import ReactionMenu from '@/components/ReactionMenu'
import ReactionBubbles from '@/components/ReactionBubbles'
import TypingIndicator from '@/components/TypingIndicator.vue'
import PayloadAttachment from '@/components/PayloadAttachment.vue'
import Avatar from '@/components/Avatar.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import UnsupportedMessage from '@/components/UnsupportedMessage.vue'
import { Picker } from 'emoji-mart-vue-fast/src/index'
import './messages'
import '@trevoreyre/autocomplete-vue/dist/style.css'
import 'emoji-mart-vue-fast/css/emoji-mart.css'

import functionsComp from './functions'
import messagesComp from './messages'
import inputComp from './input'
import reactionsComp from './reactions'

export default {
  name: 'Message',
  components: {
    Autocomplete,
    VideoPlayer,
    ExpandableImage,
    DownloadAttachment,
    UploadButton,
    ReactionMenu,
    ReactionBubbles,
    TypingIndicator,
    PayloadAttachment,
    Avatar,
    AudioPlayer,
    UnsupportedMessage,
    Picker,
  },
  emits: ['markAsRead'],
  setup() {
    const functions = functionsComp()
    const messages = messagesComp()
    const input = inputComp()
    const reactions = reactionsComp()

    return { functions, messages, input, reactions }
  },
}
</script>

<style lang="scss">
.textboxContainer {
  //position: absolute;
  bottom: 0;
  width: 100%;
  margin-right: 0px;
  margin-top: 16px;

  .subjectInput {
    border: none;
    background-image: none;
    background-color: transparent;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    box-shadow: none;
    outline: none;

    display: flex;
    flex-basis: 100%;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
    margin-left: 34px;
    width: calc(100% - 90px);
    background: #1d1d1d !important;
    border: 1px solid #545454 !important;
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
    margin-bottom: -1px;
    font-size: 14px;
    color: white;
    padding: 3px 10px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.25px;
    white-space: pre-wrap;
    position: relative;

    &:empty:before {
      content: attr(placeholder);
      color: #8a8a8a;
    }

    &.noTopBorder {
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }
  }

  .msgTextboxWrapper {
    padding: 6px;
    padding-top: 0px;
    display: flex;

    .messageInput {
      float: left;
      width: calc(100% - 85px);
      background: #1d1d1d !important;
      border: 1px solid #545454 !important;
      border-radius: 13px;
      font-size: 13px;
      line-height: 16px;
      color: white;
      outline: none;
      max-height: 300px;
      overflow-y: auto;
      padding: 3px 10px;
      padding-right: 21px;
      height: min-content;
      align-self: flex-end;
      margin-left: 4px;
      white-space: pre-wrap;

      &:empty:before {
        content: attr(placeholder);
        color: #595959;
      }

      &::-webkit-scrollbar {
        display: none;
      }

      &.noTopBorder {
        border-top-right-radius: 0px;
        border-top-left-radius: 0px;
      }
    }

    .uploadButtonContainer {
      width: 24px;
      height: 24px;

      margin-left: 0px;
      display: inline-flex;
      align-self: flex-end;
      flex-wrap: wrap;
    }

    .feather {
      align-self: flex-end;
      &:hover {
        filter: brightness(115%);
      }
      cursor: pointer;
      width: 24px;
      height: 24px;
    }

    .emojiBtn {
      display: inline-flex;
      align-self: flex-end;
      margin-left: 4px;

      .emoji-mart {
        position: absolute;
        right: 4px;
        bottom: 32px;
        background-color: rgba(35, 35, 35, 0.8);
        backdrop-filter: blur(0px);
        border-color: rgba(0, 0, 0, 0.5);
        z-index: 99999999;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;

        &.visible:not(.fade-leave-active) {
          backdrop-filter: blur(2px);
        }

        & * {
          line-height: 0.7;
        }

        &-scroll {
          margin-right: 2px;

          &::-webkit-scrollbar {
            width: 8px;
          }
          &::-webkit-scrollbar-thumb {
            background-color: #424241;
            border-radius: 16px;
          }
          &::-webkit-scrollbar-track {
            background-color: transparent;
          }
        }

        &-bar {
          border-color: rgba(0, 0, 0, 0.5);
        }

        &-search {
          margin-bottom: 6px;

          input {
            background-color: rgba(200, 200, 200, 0.1);
            border-color: rgba(87, 87, 87, 0.7);
            color: white;
          }
        }

        &-category-label {
          span {
            font-weight: 300;
            font-size: 13px;
            text-transform: uppercase;
            color: #a0a1a1;
            background-color: transparent;
          }
        }

        &-anchor {
          cursor: pointer;

          &-selected {
            color: #1fb3ff !important;
          }

          &-bar {
            background-color: #1fb3ff !important;
          }
        }

        &-emoji {
          cursor: pointer;
          span {
            cursor: pointer;
          }
          &:before {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }

        &-preview {
          height: 24px;

          &-emoji,
          &-name,
          &-emoticons {
            display: none;
          }
          &-data {
            left: 8px;

            .emoji-mart-title-label {
              display: none;
            }
          }
          &-skins {
            right: 8px;

            .emoji-mart-skin-swatches {
              background-color: rgb(90, 90, 90);
              border-color: rgb(35, 35, 35);
            }
          }
        }
      }
    }

    .sendBtn {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #1287ff;
      cursor: pointer;
      margin-right: 2px;
      margin-left: -22px;
      margin-top: 0px;
      align-self: center;

      &.SMS {
        background: #35cc5b;
      }

      svg {
        stroke: rgb(255, 255, 255);
        cursor: initial;
        width: 20px;
        height: 20px;
      }

      &.cantSend {
        filter: brightness(40%);
        cursor: initial;

        svg,
        .feather {
          cursor: initial;
        }
      }

      &:not(.cantSend) {
        .feather {
          cursor: pointer;
        }
        &:hover {
          filter: brightness(115%);
        }
      }
    }
  }
}

.attachmentPreview {
  border: 1px solid #545454;
  margin-left: 34px;
  margin-right: 34px;
  margin-bottom: -1px;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  padding: 5px;
  padding-top: 0px;

  .attachment {
    border-radius: 10px;
    padding: 6px 10px;
    color: lighten(#c2c2c2, 20%);
    background-color: #3a3a3c;
    position: relative;
    overflow-wrap: break-word;
    display: inline-block;
    max-width: 120px;
    margin-right: 5px;
    margin-top: 5px;

    .removeAttachment {
      position: absolute;
      right: -4px;
      top: -4px;
    }
  }
}

.autocomplete-result {
  padding: 12px 12px 12px 28px;
  background-image: url('../../assets/search.svg');
  background-position: 6px center;
  background-size: 14px;
}

.autocomplete-result:hover,
.autocomplete-result[aria-selected='true'] {
  background-color: rgba(0, 0, 0, 0.2) !important;
}

.autocomplete-result-list {
  border: 1px solid rgba(0, 0, 0, 0.5) !important;
  border-top-color: transparent !important;
  background: rgb(50, 50, 50) !important;
  overflow: hidden;
  border-radius: 0 !important;
  padding: 0 !important;
}

.autocomplete[data-loading='true']:after {
  width: 10px !important;
  height: 10px !important;
}

.autocomplete-input {
  margin: 0 !important;
  background: transparent !important;
  border: none !important;
  color: inherit !important;
  height: inherit !important;
  padding: 0 !important;
  font-weight: inherit !important;
  font-size: 14px !important;
  font-family: inherit !important;
  letter-spacing: 0.1px !important;
  margin-top: -2px !important;

  &:focus {
    -webkit-box-shadow: none !important;
    -moz-box-shadow: none !important;
    box-shadow: none !important;
  }
}

.receiverContainer {
  font-size: 14px;
  padding: 10px 20px;

  .label {
    font-weight: 500;
    color: #7f7f7f;
    float: left;
    -webkit-app-region: no-drag;
  }

  .contact {
    padding-left: 4px;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: calc(100% - 30px);
    // width: max-content;
    -webkit-app-region: no-drag;
  }
}

.messageContainer {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  text-align: left;
  justify-content: space-between;
  flex-direction: column;

  .titlebar {
    height: 39px;
    max-height: 39px;
    min-height: 39px;
    background-color: #373737;
    border-bottom: 2px solid #1d1d1d;

    .closeBtn {
      position: absolute;
      top: 16px;
      right: 8px;
      -webkit-app-region: no-drag;

      .feather {
        cursor: pointer;

        &:hover {
          filter: brightness(80%);
        }
      }
    }
  }
}

.messages {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 5px;
  margin-right: 2px;
  overflow-x: hidden;
  overflow-y: auto;

  .timegroup {
    text-align: center;
    // padding-top: 10px;
    padding-bottom: 10px;
    color: #999999;
    font-size: 11px;

    .bold {
      font-weight: 500;
    }
  }

  .simplebar-vertical {
    margin-right: 6px;
  }

  .simplebar-scrollbar:before {
    background: #575757;
  }

  .senderName {
    color: #999999;
    font-size: 0.85em;
    margin-left: 54px;
  }
}

.messageGroup {
  margin-bottom: 10px;
  padding-left: 20px;
  padding-right: 12px;
  display: flex;
  flex-direction: row;

  .groupWrapper {
    // display: flex;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
  }

  .authorAvatar {
    z-index: 2;
    margin-left: -10px;
    margin-top: 0px;
    margin-right: 8px;
    display: inline-flex;
    align-self: flex-end;

    img {
      border-radius: 50%;
    }
  }

  &.last {
    margin-bottom: 0px;
  }

  .attachment {
    // max-width: 75%;
    // max-height: 60vh;
    width: max-content;
    max-width: 100%;
    height: auto;
    border-radius: 18px;
    padding-bottom: 1px;
    display: block;
    // margin-bottom: -2px;

    img {
      // max-width: 280px;
      // max-height: 700px;
      border-radius: 18px;
      border-radius: 12px;
      max-height: 33vh;
      max-width: 100%;
      width: auto;
      height: auto;
      display: block;
    }

    video {
      // max-width: 420px;
      // max-height: 700px;
      border-radius: 12px;
      max-height: 33vh;
      max-width: 100%;
      width: auto;
      height: auto;
      display: block;
    }
  }
}

.message {
  border-radius: 14px;
  padding: 6px 10px;
  margin-top: 0px;
  margin-bottom: 0px;
  max-width: 100%;
  text-align: start;
  unicode-bidi: plaintext;

  &.payload {
    padding: 0;
  }

  .subject {
    white-space: pre-wrap;
    font-weight: 500;
    letter-spacing: 0.25px;
  }
}

.bubbleWrapper {
  max-width: 100%;
}

.send.iMessage {
  .message {
    background-color: #1287ff !important;
    &:before {
      background: #1287ff !important;
    }

    &.payload {
      background-color: #3a3a3c !important;
      &:before {
        background: #3a3a3c !important;
      }
    }
  }
}

.receive {
  align-items: flex-start;

  .textWrapper {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    margin-right: 25%;
    max-width: 75%;
    margin-bottom: 1px;
  }

  .message {
    color: white;
    // margin-right: 25%;
    background-color: #3a3a3c;
    position: relative;
    overflow-wrap: break-word;

    a {
      color: #2284ff;
    }

    &.last {
      &:before {
        content: '';
        position: absolute;
        z-index: 0;
        bottom: 0;
        left: -10px;
        height: 16px;
        width: 20px;
        background: #3a3a3c;
        border-bottom-right-radius: 12px;
      }

      &:after {
        content: '';
        position: absolute;
        z-index: 1;
        bottom: 0;
        left: -10px;
        width: 10px;
        height: 20px;
        background: #1d1d1d;
        border-bottom-right-radius: 8px;
      }
    }

    &.jumbo {
      padding-left: 0;
      padding-bottom: 0;
      background: transparent;
      font-size: 42px;

      .text-emoji {
        width: 42px;
        height: 42px;
      }

      &:before,
      &:after {
        background: transparent;
      }
    }
  }
}

.send {
  align-items: flex-end;
  justify-content: flex-end;

  .textWrapper {
    display: flex;
    align-items: flex-end;
    flex-direction: column;
    margin-left: 25%;
    max-width: 75%;
    margin-bottom: 1px;
  }

  .message {
    color: white;
    background: #35cc5b;
    position: relative;
    // margin-left: 25%;
    overflow-wrap: break-word;

    a {
      color: white;
    }

    &.last {
      &:before {
        content: '';
        position: absolute;
        z-index: 0;
        bottom: 0;
        right: -10px;
        height: 16px;
        width: 20px;
        background: #35cc5b;
        border-bottom-left-radius: 12px;
      }

      &:after {
        content: '';
        position: absolute;
        z-index: 1;
        bottom: 0;
        right: -10px;
        width: 10px;
        height: 20px;
        background: #1d1d1d;
        border-bottom-left-radius: 8px;
      }
    }

    &.jumbo {
      padding-right: 0;
      padding-bottom: 0;
      background: transparent !important;
      font-size: 42px;

      .text-emoji {
        width: 42px;
        height: 42px;
      }

      &:before,
      &:after {
        background: transparent !important;
      }
    }
  }

  .receipt {
    margin-top: 4px;
    margin-bottom: 4px;
    margin-right: -2px;
    color: #999999;
    font-size: 11px;

    .type {
      font-weight: 500;
    }
  }
}
</style>
