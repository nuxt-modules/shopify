import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Nuxt Shopify',

    description: 'Handbook to get you started with the nuxt-shopify module',

    base: '/nuxt-shopify/',

    cleanUrls: true,

    themeConfig: {
        editLink: {
            pattern: 'https://github.com/konkonam/nuxt-shopify/edit/main/docs/:path',
        },

        nav: [
            { text: 'Home', link: '/' },
            { text: 'Quickstart', link: '/quickstart' },
            { text: 'Examples', link: '/examples' },
            { text: 'Configuration', link: '/configuration' },
        ],

        sidebar: [
            {
                text: 'Quickstart',
                link: '/quickstart',
            },
            {
                text: 'Examples',
                link: '/examples',
                items: [
                    { text: 'Storefront', link: '/examples/storefront' },
                    { text: 'Admin', link: '/examples/admin' },
                ],
            },
            {
                text: 'Configuration',
                link: '/configuration',
                items: [
                    { text: 'Module config', link: '/configuration/module' },
                    { text: 'Codegen config', link: '/configuration/codegen' },
                ],
            },
        ],

        socialLinks: [
            { icon: 'npm', link: 'https://npmjs.com/package/@konkonam/nuxt-shopify' },
            { icon: 'github', link: 'https://github.com/konkonam/nuxt-shopify' },
            { icon: 'nuxt', link: 'https://github.com/konkonam/nuxt-shopify' },
        ],

        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024-present Zoltan Lukacs, Frederik Bußmann',
        },

        lastUpdated: {
            text: 'Last updated',
            formatOptions: {
                dateStyle: 'short',
            },
        },

        search: {
            provider: 'local',
        },
    },
})
