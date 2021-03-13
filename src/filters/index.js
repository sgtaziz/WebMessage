import Vue from 'vue'
import store from  '../store'
import emojiRegex from 'emoji-regex'
import { EmojiIndex, Emoji } from 'emoji-mart-vue-fast'
import emojiData from 'emoji-mart-vue-fast/data/all.json'

const emojiIndex = new EmojiIndex(emojiData)
const COLONS_REGEX = new RegExp(
  '([^:]+)?(:[a-zA-Z0-9-_+]+:(:skin-tone-[2-6]:)?)',
  'g')

const getEmojiComponent = emoji => {
  let emojiSet = store.state.emojiSet.toLowerCase()

  const EmojiCtor = Vue.extend(Emoji)
  const vm = new EmojiCtor({
    propsData: {
      data: emojiIndex,
      emoji: emoji,
      set: emojiSet,
      size: 16
    }
  })
  vm.$mount()

  let el = $(vm.$el).children().first()
  let attributes = { draggable: false, native: emoji.native, alt: emoji.colons, src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }
  
  $.each(el[0].attributes, (id, attr) => {
    attributes[attr.nodeName] = attr.nodeValue
  })
  attributes['background-image'] = null
  el = $('<img />', attributes)
  el.addClass('text-emoji')
  el.css('width', '')
  el.css('height', '')
  
  if (emojiSet == 'native') {
    el = $(document.createTextNode(emoji.native))
  }

  return el
}

Vue.filter('unescapeHTML', val => {
  return val
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
})

Vue.filter('nativeEmoji', val => {
  return val.replace(/\u{fffc}/gu, "").replace(emojiRegex(), (match, offset) => {
    const before = val.substring(0, offset)
    if (before.endsWith('alt="') || before.endsWith('native="')) {
      return match
    }
    let emoji = emojiIndex.nativeEmoji(match)
    if (!emoji) {
      return match
    }
    let emojiComponent = getEmojiComponent(emoji).get(0)
    return (emojiComponent.outerHTML ? emojiComponent.outerHTML : emojiComponent.textContent)
  })
})

Vue.filter('colonEmoji', val => {
  return val.replace(COLONS_REGEX, (match, p1, p2) => {
    const before = p1 || ''
    if (before.endsWith('alt="') || before.endsWith('native="')) {
      return match
    }
    let emoji = emojiIndex.findEmoji(p2)
    if (!emoji) {
      return match
    }
    let emojiComponent = getEmojiComponent(emoji).get(0)
    return before + (emojiComponent.outerHTML ? emojiComponent.outerHTML : emojiComponent.textContent)
  })
})

Vue.filter('emojiComponent', emoji => {
  return getEmojiComponent(emoji)
})