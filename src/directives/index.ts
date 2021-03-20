import tooltipDirective from './Tooltip/'
import { App } from 'vue'

// register all directives
const directives = (app: App<Element>) => {
  tooltipDirective(app)
}

export default directives
