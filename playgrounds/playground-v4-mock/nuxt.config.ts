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

    compatibilityDate: '2026-03-15',

    shopify: {
        clients: {
            storefront: {
                mock: true,
            },
        },
    },
})
