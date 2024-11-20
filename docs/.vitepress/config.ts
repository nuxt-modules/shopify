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

    themeConfig: {
        editLink: {
            pattern: 'https://github.com/konkonam/nuxt-shopify/edit/main/docs/:path',
        },

        nav: [
            { text: 'Home', link: '/' },
            { text: 'Quickstart', link: '/quickstart' },
            { text: 'Examples', link: '/examples/storefront', activeMatch: '/examples/' },
            { text: 'Configuration', link: '/configuration/module', activeMatch: '/configuration/' },
            {
                text: pkg?.version ?? 'stable',
                items: [
                    {
                        text: 'Changelog',
                        link: 'https://github.com/konkonam/nuxt-shopify/tree/main/CHANGELOG.md',
                    },
                    {
                        text: 'Contributing',
                        link: 'https://github.com/konkonam/nuxt-shopify/tree/main/.github/CONTRIBUTING.md',
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
                ],
            },
        ],

        socialLinks: [
            { icon: 'npm', link: 'https://npmjs.com/package/@konkonam/nuxt-shopify' },
            { icon: 'github', link: 'https://github.com/konkonam/nuxt-shopify' },
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
