// Forked from trevoreyre/autocomplete

<template>
  <div ref="root">
    <slot
      :rootProps="rootProps"
      :inputProps="inputProps"
      :inputListeners="inputListeners"
      :resultListProps="resultListProps"
      :resultListListeners="resultListListeners"
      :results="results"
      :resultProps="resultProps"
    >
      <div v-bind="rootProps">
        <input
          ref="input"
          v-bind="inputProps"
          @input="handleInput"
          @keydown="core.handleKeyDown"
          @focus="core.handleFocus"
          @blur="core.handleBlur"
          v-on="$attrs"
        />
        <ul ref="resultList" v-bind="resultListProps" v-on="resultListListeners">
          <template v-for="(result, index) in results">
            <slot name="result" :result="result" :props="resultProps[index]">
              <li :key="resultProps[index].id" v-bind="resultProps[index]">
                {{ getResultValue(result) }}
              </li>
            </slot>
          </template>
        </ul>
      </div>
    </slot>
  </div>
</template>

<script>
import AutocompleteCore from './AutocompleteCore.js'
import uniqueId from './util/uniqueId.js'
import getRelativePosition from './util/getRelativePosition.js'
import debounce from './util/debounce.js'

export default {
  name: 'Autocomplete',
  inheritAttrs: false,

  props: {
    search: {
      type: Function,
      required: true,
    },
    baseClass: {
      type: String,
      default: 'autocomplete',
    },
    autoSelect: {
      type: Boolean,
      default: false,
    },
    getResultValue: {
      type: Function,
      default: result => result,
    },
    defaultValue: {
      type: String,
      default: '',
    },
    debounceTime: {
      type: Number,
      default: 0,
    },
  },

  data() {
    const core = new AutocompleteCore({
      search: this.search,
      autoSelect: this.autoSelect,
      setValue: this.setValue,
      onUpdate: this.handleUpdate,
      onSubmit: this.handleSubmit,
      onShow: this.handleShow,
      onHide: this.handleHide,
      onLoading: this.handleLoading,
      onLoaded: this.handleLoaded,
    })
    if (this.debounceTime > 0) {
      core.handleInput = debounce(core.handleInput, this.debounceTime)
    }

    return {
      core,
      value: this.defaultValue,
      resultListId: uniqueId(`${this.baseClass}-result-list-`),
      results: [],
      selectedIndex: -1,
      expanded: false,
      loading: false,
      position: 'below',
      resetPosition: true,
    }
  },

  computed: {
    rootProps() {
      return {
        class: this.baseClass,
        style: { position: 'relative' },
        'data-expanded': this.expanded,
        'data-loading': this.loading,
        'data-position': this.position,
      }
    },
    inputProps() {
      return {
        class: `${this.baseClass}-input`,
        value: this.value,
        role: 'combobox',
        autocomplete: 'off',
        autocapitalize: 'off',
        autocorrect: 'off',
        spellcheck: 'false',
        'aria-autocomplete': 'list',
        'aria-haspopup': 'listbox',
        'aria-owns': this.resultListId,
        'aria-expanded': this.expanded ? 'true' : 'false',
        'aria-activedescendant': this.selectedIndex > -1 ? this.resultProps[this.selectedIndex].id : '',
        ...this.$attrs,
      }
    },
    inputListeners() {
      return {
        input: this.handleInput,
        keydown: this.core.handleKeyDown,
        focus: this.core.handleFocus,
        blur: this.core.handleBlur,
      }
    },
    resultListProps() {
      const yPosition = this.position === 'below' ? 'top' : 'bottom'
      return {
        id: this.resultListId,
        class: `${this.baseClass}-result-list`,
        role: 'listbox',
        style: {
          position: 'absolute',
          zIndex: 1,
          width: '100%',
          visibility: this.expanded ? 'visible' : 'hidden',
          pointerEvents: this.expanded ? 'auto' : 'none',
          [yPosition]: '100%',
        },
      }
    },
    resultListListeners() {
      return {
        mousedown: this.core.handleResultMouseDown,
        click: this.core.handleResultClick,
      }
    },
    resultProps() {
      return this.results.map((result, index) => ({
        id: `${this.baseClass}-result-${index}`,
        class: `${this.baseClass}-result`,
        'data-result-index': index,
        role: 'option',
        ...(this.selectedIndex === index ? { 'aria-selected': 'true' } : {}),
      }))
    },
  },

  mounted() {
    document.body.addEventListener('click', this.handleDocumentClick)
  },

  beforeUnmount() {
    document.body.removeEventListener('click', this.handleDocumentClick)
  },

  updated() {
    if (!this.$refs.input || !this.$refs.resultList) {
      return
    }
    if (this.resetPosition && this.results.length > 0) {
      this.resetPosition = false
      this.position = getRelativePosition(this.$refs.input, this.$refs.resultList)
    }
    this.core.checkSelectedResultVisible(this.$refs.resultList)
  },

  methods: {
    setValue(result) {
      this.value = result ? this.getResultValue(result) : ''
    },

    handleUpdate(results, selectedIndex) {
      this.results = results
      this.selectedIndex = selectedIndex
      this.$emit('update', results, selectedIndex)
    },

    handleShow() {
      this.expanded = true
    },

    handleHide() {
      this.expanded = false
      this.resetPosition = true
    },

    handleLoading() {
      this.loading = true
    },

    handleLoaded() {
      this.loading = false
    },

    handleInput(event) {
      this.value = event.target.value
      this.core.handleInput(event)
    },

    handleSubmit(selectedResult) {
      this.$emit('submit', selectedResult)
    },

    handleDocumentClick(event) {
      if (this.$refs.root.contains(event.target)) {
        return
      }
      this.core.hideResults()
    },
  },
}
</script>

<style>
.autocomplete-input {
  border: 1px solid #eee;
  border-radius: 8px;
  width: 100%;
  padding: 12px 12px 12px 48px;
  box-sizing: border-box;
  position: relative;
  font-size: 16px;
  line-height: 1.5;
  flex: 1;
  background-color: #eee;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTEiIGN5PSIxMSIgcj0iOCIvPjxwYXRoIGQ9Ik0yMSAyMWwtNC00Ii8+PC9zdmc+');
  background-repeat: no-repeat;
  background-position: 12px center;
}

.autocomplete-input:focus,
.autocomplete-input[aria-expanded='true'] {
  border-color: rgba(0, 0, 0, 0.12);
  background-color: #fff;
  outline: none;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.16);
}

[data-position='below'] .autocomplete-input[aria-expanded='true'] {
  border-bottom-color: transparent;
  border-radius: 8px 8px 0 0;
}

[data-position='above'] .autocomplete-input[aria-expanded='true'] {
  border-top-color: transparent;
  border-radius: 0 0 8px 8px;
  z-index: 2;
}

/* Loading spinner */
.autocomplete[data-loading='true']::after {
  content: '';
  border: 3px solid rgba(0, 0, 0, 0.12);
  border-right: 3px solid rgba(0, 0, 0, 0.48);
  border-radius: 100%;
  width: 20px;
  height: 20px;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  animation: rotate 1s infinite linear;
}

.autocomplete-result-list {
  margin: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0;
  box-sizing: border-box;
  max-height: 296px;
  overflow-y: auto;
  background: #fff;
  list-style: none;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.16);
}

[data-position='below'] .autocomplete-result-list {
  margin-top: -1px;
  border-top-color: transparent;
  border-radius: 0 0 8px 8px;
  padding-bottom: 8px;
}

[data-position='above'] .autocomplete-result-list {
  margin-bottom: -1px;
  border-bottom-color: transparent;
  border-radius: 8px 8px 0 0;
  padding-top: 8px;
}

/* Single result item */
.autocomplete-result {
  cursor: default;
  padding: 12px 12px 12px 48px;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTEiIGN5PSIxMSIgcj0iOCIvPjxwYXRoIGQ9Ik0yMSAyMWwtNC00Ii8+PC9zdmc+');
  background-repeat: no-repeat;
  background-position: 12px center;
}

.autocomplete-result:hover,
.autocomplete-result[aria-selected='true'] {
  background-color: rgba(0, 0, 0, 0.06);
}

@keyframes rotate {
  from {
    transform: translateY(-50%) rotate(0deg);
  }
  to {
    transform: translateY(-50%) rotate(359deg);
  }
}
</style>
