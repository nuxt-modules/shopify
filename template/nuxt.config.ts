// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        '../src/module',
        '@nuxt/ui',
        '@nuxt/content',
        '@nuxtjs/i18n',
        '@nuxt/image',
        '@vueuse/nuxt',
    ],

    components: {
        dirs: [
            {
                path: '~/components/common',
                pathPrefix: false,
            },
            {
                path: '~/components',
                pathPrefix: true,
            },
        ],
    },

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
                '.vercel.app',
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

    shopify: {
        name: 'nuxt-shopify-demo-store',

        clients: {
            storefront: {
                mock: true,
                apiVersion: '2025-07',
            },
        },
    },
})
