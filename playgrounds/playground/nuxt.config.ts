import * as dotenv from 'dotenv'

dotenv.config({
    path: '../../.env',
})

export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    srcDir: 'src/',

    compatibilityDate: '2024-11-07',

    shopify: {
        name: process.env.SHOPIFY_STOREFRONT_NAME ?? '',
        logger: {
            level: 999,
        },
        clients: {
            storefront: {
                apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '',
                publicAccessToken: process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN ?? '',

                client: true,
            },
        },
    },
})
