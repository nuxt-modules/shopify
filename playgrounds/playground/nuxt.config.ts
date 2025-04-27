export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    srcDir: 'src/',

    compatibilityDate: '2024-11-07',

    shopify: {
        name: process.env.NUXT_SHOPIFY_STOREFRONT_NAME as string,

        logger: {
            level: 999,
        },

        clients: {
            storefront: {
                apiVersion: process.env.NUXT_SHOPIFY_STOREFRONT_API_VERSION as string,
                publicAccessToken: process.env.NUXT_SHOPIFY_STOREFRONT_PUBLIC_TOKEN as string,
            },
        },
    },
})
