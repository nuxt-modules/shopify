export default defineNuxtConfig({
    modules: [
        '@nuxt/image',
        '@nuxt/ui',
        '@nuxtjs/i18n',
        '@vueuse/nuxt',
        '../src/module',
    ],

    css: ['~/assets/css/main.css'],

    appConfig: {
        ui: {
            colors: {
                primary: 'indigo',
                neutral: 'neutral',
            },

            card: {
                slots: {
                    root: 'p-0 ring-0 shadow-none',
                    body: 'p-0 sm:p-0',
                },
            },

            breadcrumb: {
                slots: {
                    linkLabel: 'truncate mb-[2px]',
                    separator: 'flex -mb-[2px]',
                    variants: {
                        active: {
                            false: {
                                link: 'text-[var(--ui-text-muted)] font-medium mb-[2px]',
                            },
                        },
                    },
                },
            },

            icons: {
                arrowLeft: 'hugeicons:arrow-left-01',
                arrowRight: 'hugeicons:arrow-right-01',
                check: 'hugeicons:checkmark-square-04',
                chevronDoubleLeft: 'hugeicons:arrow-left-double',
                chevronDoubleRight: 'hugeicons:arrow-right-double',
                chevronDown: 'hugeicons:arrow-down-01',
                chevronLeft: 'hugeicons:arrow-left-01',
                chevronRight: 'hugeicons:arrow-right-01',
                chevronUp: 'hugeicons:arrow-up-01',
                close: 'hugeicons:cancel-01',
                ellipsis: 'hugeicons:ease-curve-control-points',
                external: 'hugeicons:shared-wifi',
                minus: 'hugeicons:minus-sign',
                plus: 'hugeicons:plus-sign',
                search: 'hugeicons:search-01',
            },
        },
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
                language: 'en',
                name: 'English',
                file: 'en.json',
            },
            {
                code: 'de',
                language: 'de',
                name: 'Deutsch',
                file: 'de.json',
            },
            {
                code: 'fr',
                language: 'fr',
                name: 'Français',
                file: 'fr.json',
            },
        ],

        bundle: {
            optimizeTranslationDirective: false,
        },
    },

    image: {
        densities: [1, 2],
    },

    shopify: {
        name: process.env.NUXT_SHOPIFY_NAME as string,

        logger: {
            level: 1,
        },

        clients: {
            storefront: {
                apiVersion: process.env.NUXT_SHOPIFY_API_VERSION as string,
                publicAccessToken: process.env.NUXT_SHOPIFY_STOREFRONT_PUBLIC_ACCESS_TOKEN as string,
            },
        },
    },
})
