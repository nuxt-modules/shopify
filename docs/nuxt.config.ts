export default defineNuxtConfig({
    extends: ['docus'],

    modules: [
        '../src/module',
        '@nuxt/ui',
        '@nuxtjs/critters',
        'motion-v/nuxt',
    ],

    components: {
        dirs: [
            {
                path: '~/components',
                pathPrefix: false,
            },
        ],
    },

    app: {
        head: {
            meta: [
                { name: 'apple-mobile-web-app-title', content: 'Nuxt Shopify' },
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
                { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
                { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
                { rel: 'manifest', href: '/site.webmanifest' },
            ],
        },
    },

    css: ['~/assets/css/main.css'],

    site: {
        name: 'Nuxt Shopify',
        url: 'https://shopify.nuxtjs.org',
    },

    runtimeConfig: {
        shopify: {
            name: 'nuxt-shopify-docs',

            clients: {
                storefront: {
                    apiVersion: '',
                    proxy: false,
                    mock: true,
                },
            },
        },
    },

    nitro: {
        typescript: {
            tsConfig: {
                compilerOptions: {
                    verbatimModuleSyntax: false,
                },
            },
        },
    },

    vite: {
        build: {
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        if (id.includes('vaul-vue')) return 'vaul-vue'
                        if (id.includes('reka-ui')) return 'reka-ui'
                    },
                },
            },
        },
        optimizeDeps: {
            include: ['vaul-vue', 'reka-ui'],
        },
    },

    image: {
        domains: ['cdn.shopify.com'],

        formats: ['avif', 'webp'],

        alias: {
            shopify: 'https://cdn.shopify.com',
        },
    },

    ogImage: {
        defaults: {
            url: '/logo-readme.jpg',
        },
    },
})
