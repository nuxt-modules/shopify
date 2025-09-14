export default defineNuxtConfig({
    extends: ['docus'],

    modules: [
        '../src/module',
        '@nuxt/ui-pro',
        'motion-v/nuxt',
    ],

    app: {
        baseURL: '/shopify/',
    },

    css: ['~/assets/css/main.css'],

    site: {
        name: 'Nuxt Shopify',
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
})
