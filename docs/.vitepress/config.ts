import { readFileSync } from 'node:fs'
import { resolve } from 'node:url'
import { defineConfig } from 'vitepress'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Nuxt Shopify',

    description: 'Easily integrate shopify into your nuxt 3 & 4 project!',

    base: '/nuxt-shopify/',

    cleanUrls: true,

    head: [
        [
            'meta',
            {
                property: 'og:image',
                content: '/nuxt-shopify/logo-readme.jpg',
            },
        ],
    ],

    themeConfig: {
        editLink: {
            pattern: 'https://github.com/nuxt-modules/shopify/edit/main/docs/:path',
        },

        nav: [
            { text: 'Home', link: '/' },
            { text: 'Quickstart', link: '/quickstart' },
            { text: 'Examples', link: '/examples/storefront', activeMatch: '/examples/' },
            { text: 'Configuration', link: '/configuration/module', activeMatch: '/configuration/' },
            {
                text: pkg?.version ? `v${pkg.version}` : 'stable',
                items: [
                    {
                        text: 'Changelog',
                        link: 'https://github.com/nuxt-modules/shopify/tree/main/CHANGELOG.md',
                    },
                    {
                        text: 'Contributing',
                        link: 'https://github.com/nuxt-modules/shopify/tree/main/.github/CONTRIBUTING.md',
                    },
                ],
            },
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    { text: 'Quickstart', link: '/quickstart' },
                ],
            },
            {
                text: 'Examples',
                items: [
                    { text: 'Storefront', link: '/examples/storefront' },
                    { text: 'Admin', link: '/examples/admin' },
                ],
            },
            {
                text: 'Configuration',
                items: [
                    { text: 'Module config', link: '/configuration/module' },
                    { text: 'Codegen config', link: '/configuration/codegen' },
                    { text: 'Hooks reference', link: '/configuration/hooks' },
                ],
            },
        ],

        socialLinks: [
            { icon: 'npm', link: 'https://npmjs.com/package/@nuxtjs/shopify' },
            { icon: 'github', link: 'https://github.com/nuxt-modules/shopify' },
        ],

        footer: {
            message: 'Released under the MIT License.',
            copyright: '2024-present Zoltan Lukacs, Frederik Bußmann',
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
