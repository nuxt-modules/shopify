// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'

import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'

import '@fontsource-variable/sono/mono'
import '@fontsource-variable/sono'
import './style.css'

export default {
    extends: DefaultTheme,
    Layout: () => {
        return h(DefaultTheme.Layout, null, {
        })
    },
    enhanceApp({ app, router, siteData }) {
    // ...
    },
} satisfies Theme
