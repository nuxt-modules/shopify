import * as dotenv from 'dotenv'

dotenv.config()

export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    srcDir: 'src/',

    compatibilityDate: '2024-11-07',

    hooks: {
        'storefront:generate:operations': ({ nuxt, config }) => {
            console.log(config)
        },
    },

    shopify: {
        name: process.env.SHOPIFY_STOREFRONT_NAME ?? '',
        debug: true,
        clients: {
            storefront: {
                apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '',
                publicAccessToken: process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN ?? '',
            },
        },
    },
})
