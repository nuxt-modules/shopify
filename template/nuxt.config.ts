// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        '@konkonam/nuxt-shopify',
        '@nuxt/ui',
        '@nuxt/content',
        '@nuxtjs/i18n',
        '@nuxt/image',
        '@vueuse/nuxt',
    ],

    devtools: { enabled: true },

    css: ['~/assets/main.css'],

    content: {
        renderer: {
            anchorLinks: false,
        },
    },

    ui: {
        colorMode: false,
    },

    compatibilityDate: '2025-07-15',

    vite: {
        server: {
            allowedHosts: [
                '.ngrok-free.app',
            ],
        },
    },

    fonts: {
        families: [
            {
                name: 'Source Sans 3',
                provider: 'google',
            },
        ],
    },

    i18n: {
        strategy: 'prefix_except_default',

        defaultLocale: 'en-us',

        locales: [
            {
                code: 'en-us',
                language: 'en',
                name: 'English (USD)',
                file: 'en.json',
            },
            {
                code: 'de-de',
                language: 'de',
                name: 'German (EUR)',
                file: 'de.json',
            },
            {
                code: 'de-at',
                language: 'de',
                name: 'Austria (EUR)',
                file: 'de.json',
            },
        ],
    },

    image: {
        providers: {
            shopify: {
                provider: '~/providers/shopify.ts',
            },
        },
    },

    shopify: {
        name: process.env.NUXT_SHOPIFY_NAME,

        logger: {
            level: 3,
        },

        clients: {
            storefront: {
                publicAccessToken: process.env.NUXT_SHOPIFY_STOREFRONT_PUBLIC_ACCESS_TOKEN,

                apiVersion: '2025-07',
            },
        },
    },
})
