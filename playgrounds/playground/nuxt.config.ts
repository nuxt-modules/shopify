export default defineNuxtConfig({
    modules: [
        '../src/module',
        '../src/module',
    ],

    srcDir: 'src/',

    compatibilityDate: '2024-11-07',

    shopify: {
        name: process.env.SHOPIFY_NAME,
        debug: true,
        clients: {
            storefront: {
                apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '2024-10',
                accessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? '',
            },
        },
    },
})
