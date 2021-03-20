import { App, DirectiveBinding } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function init(el: Element, binding: DirectiveBinding<any>) {
  const position = binding.arg || 'top'
  const tooltipText = binding.value || 'Tooltip text'
  el.setAttribute('position', position)
  el.setAttribute('tooltip', tooltipText)
}

const tooltipDirective = (app: App<Element>) => {
  app.directive('tooltip', {
    mounted(el, binding) {
      init(el, binding)
    },
    updated(el, binding) {
      init(el, binding)
    },
  })
}

export default tooltipDirective
