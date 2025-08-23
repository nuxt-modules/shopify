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

    runtimeConfig: {
        shopify: {
            name: '',

            clients: {
                storefront: {
                    apiVersion: '',
                    publicAccessToken: '',
                },
            },
        },
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
                file: 'en.json',
            },
            {
                code: 'de-de',
                language: 'de',
                file: 'de.json',
            },
            {
                code: 'de-at',
                language: 'de',
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
})
