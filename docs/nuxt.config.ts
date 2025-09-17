export default defineNuxtConfig({
    extends: ['docus'],

    modules: [
        '../src/module',
        '@nuxt/ui-pro',
        '@nuxtjs/critters',
        'motion-v/nuxt',
    ],

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
