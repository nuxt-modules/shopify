export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    compatibilityDate: '2025-06-17',

    shopify: {
        name: process.env.NUXT_SHOPIFY_NAME as string,

        logger: {
            level: 3,
        },

        clients: {
            storefront: {
                apiVersion: process.env.NUXT_SHOPIFY_API_VERSION as string,
                publicAccessToken: process.env.NUXT_SHOPIFY_STOREFRONT_PUBLIC_ACCESS_TOKEN as string,
            },
        },
    },
})
