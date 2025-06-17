export default defineNuxtConfig({
    modules: [
        '@nuxt/image',
        '@nuxt/ui',
        '@nuxtjs/i18n',
        '@vueuse/nuxt',
        'nuxt-auth-utils',
        '../src/module',
    ],

    app: {
        head: {
            link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
                { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
                { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
                { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
                { rel: 'manifest', href: '/site.webmanifest' },
            ],
        },
    },

    css: ['~/assets/css/main.css'],

    runtimeConfig: {
        sessionPassword: process.env.NUXT_SESSION_PASSWORD as string,
    },

    build: {
        transpile: [
            'reka-ui',
            'vaul-vue',
        ],
    },

    future: {
        compatibilityVersion: 4,
    },

    compatibilityDate: '2025-01-31',

    nitro: {
        imports: {
            dirs: [
                './server/utils',
                './server/graphql',
            ],
        },
    },

    vite: {
        server: {
            allowedHosts: [
                '.ngrok-free.app',
                '.vercel.app',
            ],
        },

        optimizeDeps: {
            include: [
                'zod',
            ],
        },
    },

    telemetry: false,

    fonts: {
        families: [
            {
                name: 'Jura',
                provider: 'google',
            },
        ],

        defaults: {
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
            subsets: ['latin'],
        },
    },

    i18n: {
        strategy: 'prefix_except_default',

        defaultLocale: 'en',

        locales: [
            {
                code: 'en',
                name: 'English',
                file: 'en.json',
                defaultCountry: 'US',
            },
            {
                code: 'de',
                name: 'Deutsch',
                file: 'de.json',
                defaultCountry: 'DE',
            },
            {
                code: 'fr',
                name: 'Français',
                file: 'fr.json',
                defaultCountry: 'FR',
            },
        ],

        bundle: {
            optimizeTranslationDirective: false,
        },
    },

    image: {
        densities: [1, 2],

        providers: {
            shopify: {
                provider: '~/providers/shopify.ts',
            },
        },
    },

    shopify: {
        name: process.env.NUXT_SHOPIFY_NAME as string,

        logger: {
            level: 3,
        },

        clients: {
            storefront: {
                apiVersion: process.env.NUXT_SHOPIFY_API_VERSION as string,
                privateAccessToken: process.env.NUXT_SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN as string,
            },
        },
    },
})
