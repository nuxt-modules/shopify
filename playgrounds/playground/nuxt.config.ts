import { loadEnv } from 'vite';

const env = await import('dotenv').then(({ config }) => config({
    path: '../../.env'
}))

console.log(env)

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
                skipCodegen: true,
                apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '2024-10',
                publicAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? '',
            },
        },
    },
})
