// Copyright © 2020-present Techassi (https://github.com/techassi)
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.
// vue-lazy-image 1.0.0
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vue')) :
    typeof define === 'function' && define.amd ? define(['exports', 'vue'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VueYouTubeEmbed = {}, global.Vue));
}(this, (function (exports, vue) { 'use strict';

    const manager = {
        callbacks: new Map(),
        backlog: [],
        uid: 0,
        io: null,

        registerObserver(options = {}) {
            this.io = new IntersectionObserver(this.callback.bind(this), options);
        },
        register(id, intersectedCallback) {
            this.io.observe(document.getElementById(id));
            this.callbacks.set(id, intersectedCallback);
        },

        runBacklog() {
            this.backlog.forEach((registerCallback) => {
                registerCallback(`vue-lazy-image-${this.uid}`);
            });
            this.backlog = [];
        },

        callback(entries) {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.io.unobserve(document.getElementById(entry.target.id));
                    this.callbacks.get(entry.target.id)();
                }
            });
        },
    };

    const image = {
        name: 'LazyImage',
        props: {
            src: {
                type: String,
                required: true,
                default: false,
            },
            id: {
                type: String,
                required: true,
            },
            usePicture: {
                type: Boolean,
                default: false,
            },
        },
        data() {
            return {
                isIntersected: false,
                isLoaded: false,
                isError: false,
            };
        },
        computed: {
            imageSrc() {
                return this.isIntersected
                    ? this.src
                    : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            },
        },
        methods: {
            intersected() {
                this.isIntersected = true;
                // this.$el.src = this.src;
                this.$emit('intersected', this.$el);
            },
            loaded() {
                this.isLoaded = true;
                this.$emit('loaded', this.$el);
            },
            error() {
                this.isError = true;
                this.$emit('error', this.$el);
            },
        },
        render() {
            const img = vue.h('img', {
                class: [
                    'vue-lazy-image',
                    { loaded: this.isLoaded, error: this.isError },
                ],
                src: this.imageSrc,
                id: this.id,
                onLoad: this.loaded,
                onError: this.error,
            });

            if (!this.usePicture) {
                return img;
            }

            return vue.h(
                'picture',
                { onLoad: this.loaded, onError: this.error },
                this.intersected ? [this.$slots.default(), img] : [img]
            );
        },
        mounted() {
            manager.register(this.id, this.intersected);
        },
    };

    const plugin = {
        install: (app) => {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                return;
            }
            if (!('IntersectionObserver' in window)) {
                return;
            }

            app.component('lazy-image', image);
            manager.registerObserver();
            manager.runBacklog();
        },
    };

    exports.default = plugin;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
