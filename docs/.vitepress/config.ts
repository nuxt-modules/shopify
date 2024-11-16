import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Nuxt Shopify',

    description: 'Handbook to get you started with the nuxt-shopify module',

    base: '/nuxt-shopify/',

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
            { icon: 'github', link: 'https://github.com/konkonam/nuxt-shopify' },
        ],
    },
})
