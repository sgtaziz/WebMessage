import store from '../store'
import emojiRegex from 'emoji-regex'
import { EmojiIndex, EmojiView } from 'emoji-mart-vue-fast/src/index'
import emojiData from 'emoji-mart-vue-fast/data/all.json'

const emojiIndex = new EmojiIndex(emojiData)
const COLONS_REGEX = new RegExp('([^:]+)?(:[a-zA-Z0-9-_+]+:(:skin-tone-[2-6]:)?)', 'g')

const getEmojiComponent = (emoji: EmojiObject) => {
  const emojiSet = store.state.emojiSet.toLowerCase()

  if (emojiSet == 'native') {
    return $(document.createTextNode(emoji.native))
  }

  const emojiView = new EmojiView(emoji, null, emojiSet, null, null, null, 16)
  const attributes = {
    draggable: false,
    native: emoji.native,
    alt: emoji.colons,
    src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    class: emojiView.cssClass.join(' '),
  }

  const $el = $('<img />', attributes)

  Object.keys(emojiView.cssStyle).forEach((key: string) => {
    $el.css(key, emojiView.cssStyle[key])
  })

  $el.addClass('text-emoji')
  $el.css('width', '')
  $el.css('height', '')
  return $el
}

export default {
  escapeHTML(val: string) {
    const divEscapedHtml: HTMLElement = document.createElement('div')
    const escapedHtmlTextNode: Text = divEscapedHtml.appendChild(document.createTextNode(val))

    const escapedHtml: HTMLElement = escapedHtmlTextNode.parentNode as HTMLElement
    const escapedHtmlContent: string = escapedHtml.innerHTML

    escapedHtml.removeChild(escapedHtmlTextNode)
    divEscapedHtml.parentNode?.removeChild(divEscapedHtml)

    return escapedHtmlContent
  },
  unescapeHTML(val: string) {
    return val
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
  },
  nativeEmoji(val: string) {
    val = val.replace(/\u{fffc}/gu, '').replace(emojiRegex(), (match, offset) => {
      const before = val.substring(0, offset)
      if (before.endsWith('alt="') || before.endsWith('native="')) {
        return match
      }
      const emoji = emojiIndex.nativeEmoji(match)
      if (!emoji) {
        return match
      }
      const emojiComponent = getEmojiComponent(emoji).get(0) as Element

      return (emojiComponent.outerHTML ? emojiComponent.outerHTML : emojiComponent.textContent) as string
    })

    return val
  },
  colonEmoji(val: string) {
    return val.replace(COLONS_REGEX, (match: string, p1: string, p2: string) => {
      const before = p1 || ''
      if (before.endsWith('alt="') || before.endsWith('native="')) {
        return match
      }
      const emoji = emojiIndex.findEmoji(p2)
      if (!emoji) {
        return match
      }
      const emojiComponent = getEmojiComponent(emoji).get(0) as Element
      return before + (emojiComponent.outerHTML ? emojiComponent.outerHTML : emojiComponent.textContent)
    })
  },
  emojiComponent(emoji: EmojiObject) {
    return getEmojiComponent(emoji)
  },
}
