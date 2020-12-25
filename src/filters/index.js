import Vue from "vue"

Vue.filter("twemoji", val => {
  return Vue.$twemoji.parse(val.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;"))
    .replace(/\u{fffc}/gu, "") //The curse
})
