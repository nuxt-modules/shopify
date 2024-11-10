export default defineNuxtConfig({
    modules: [
        '../src/module',
    ],

    srcDir: 'src/',

    compatibilityDate: '2024-11-07',

    shopify: {
        name: 'quickstart-a5b1ec22',
        debug: true,
        clients: {
            storefront: {
                apiVersion: '2024-10',
                accessToken: '',
            },
            admin: {
                apiVersion: '2024-10',
                accessToken: '',
            },
        },
    },
})
