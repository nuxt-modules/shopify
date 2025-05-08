export default defineNuxtConfig({
    modules: [
        '@nuxt/image',
        '@nuxt/ui',
        '@nuxtjs/i18n',
        '@vueuse/nuxt',
        'nuxt-auth-utils',
        '@konkonam/nuxt-shopify',
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

            button: {
                variants: {
                    variant: {
                        navigation: 'px-2 md:px-3 hover:bg-elevated/50 text-dimmed hover:text-muted disabled:text-dimmed aria-disabled:text-dimmed focus:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary',
                    },
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
                external: 'hugeicons:arrow-up-right-01',
                minus: 'hugeicons:minus-sign',
                plus: 'hugeicons:plus-sign',
                search: 'hugeicons:search-01',
            },

            modal: {
                slots: {
                    overlay: 'fixed inset-0 bg-black/10 backdrop-blur-xs',
                },
            },

            slideover: {
                slots: {
                    overlay: 'fixed inset-0 bg-black/10 backdrop-blur-xs',
                },
            },

            drawer: {
                slots: {
                    overlay: 'fixed inset-0 bg-black/10 backdrop-blur-xs',
                },
            },
        },
    },

    runtimeConfig: {
        sessionPassword: process.env.NUXT_SESSION_PASSWORD as string,
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
            level: 1,
        },

        clients: {
            storefront: {
                apiVersion: process.env.NUXT_SHOPIFY_API_VERSION as string,
                privateAccessToken: process.env.NUXT_SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN as string,
            },
        },
    },
})
