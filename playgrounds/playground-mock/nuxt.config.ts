export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    runtimeConfig: {
        shopify: {
            name: '',

            clients: {
                storefront: {
                    apiVersion: '',
                },
            },
        },
    },

    compatibilityDate: '2025-08-22',

    shopify: {
        clients: {
            storefront: {
                mock: true,

                apiVersion: '',
            },
        },
    },
})
