# vue-lazy-image

This plugin lets you lazy load images making use of IntersectionObserver. This plugin is Vue V3 compatible.

## Planned features

-   Observe images based on class instead of unique ids (make it configurable trough options)

## Usage

### Installation

```shell
npm install @techassi/vue-lazy-image --save
```

or

```shell
yarn add @techassi/vue-lazy-image
```

### Basic usage

`main.js`

```js
import { createApp } from 'vue';
import App from './App.vue';

import VueLazyImage from 'vue-lazy-image';

createApp(App).use(VueLazyImage).mount('#app');
```

`YourComponent.vue`

```vue
<template>
    <lazy-image :src="PATH_TO_IMAGE" :id="UNIQUE_ID"></lazy-image>
</template>
```

### Advanced usage

`main.js`

```js
import { createApp } from 'vue';
import App from './App.vue';

import VueLazyImage from 'vue-lazy-image';

const intersectionObserverOptions = {};
createApp(App).use(VueLazyImage, intersectionObserverOptions).mount('#app');
```

`YourComponent.vue`

```vue
<template>
    <lazy-image
        :src="PATH_TO_IMAGE"
        :id="UNIQUE_ID"
        :use-picture="TRUE / FALSE"
        @EVENT="CALLBACK"
    ></lazy-image>
</template>
```

For detailed Intersection observer options see [here](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#Intersection_observer_options)

#### Available Events

-   `@intersected`: This event triggers when the image intersects with the viewport
-   `@loaded`: This event triggers when the image is loaded
-   `@error`: This event triggers when there was an error loading the image

## Contributing / Building

Contributions and pull request are welcome!

```shell
cd vue-lazy-image
yarn install / npm install
yarn run build / npm run build
```
