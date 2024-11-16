import * as dotenv from 'dotenv'

dotenv.config()

export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    srcDir: 'src/',





    compatibilityDate: '2024-11-07',

    shopify: {
        name: process.env.SHOPIFY_STORE_NAME ?? 'quickstart-a5b1ec22',
        debug: true,
        clients: {
            storefront: {
                apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '2024-10',
                publicAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? '',
            },
        },
    },
})
