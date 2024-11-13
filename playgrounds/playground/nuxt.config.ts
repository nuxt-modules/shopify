await import('dotenv').then(({ config }) => config())

export default defineNuxtConfig({
    modules: [
        '../src/module',
    ],

    srcDir: 'src/',

    compatibilityDate: '2024-11-07',

    hooks: {
        'shopify:codegen:resolved': ({ nuxt, generates }) => {
            console.log(generates)
        },
    },

    shopify: {
        name: process.env.NUXT_SHOPIFY_NAME,
        debug: true,
        clients: {
            storefront: {
                apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '2024-10',
                accessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? '',
            },
        },
    },
})
