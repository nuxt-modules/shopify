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

    compatibilityDate: '2025-11-01',

    shopify: {
        clients: {
            storefront: {
                mock: true,
            },
        },
    },
})
