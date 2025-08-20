export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    compatibilityDate: '2025-06-17',

    shopify: {
        name: 'mock',

        logger: {
            level: 3,
        },

        clients: {
            storefront: {
                mock: true,

                apiVersion: process.env.NUXT_SHOPIFY_API_VERSION as string,
            },
        },
    },
})
