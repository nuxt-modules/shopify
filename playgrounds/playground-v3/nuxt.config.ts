export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    runtimeConfig: {
        shopify: {
            name: '',

            clients: {
                storefront: {
                    apiVersion: '',
                    publicAccessToken: '',
                },

                admin: {
                    apiVersion: '',
                    accessToken: '',

                    autoImport: false,
                },
            },
        },
    },

    srcDir: 'src/',

    compatibilityDate: '2025-11-01',
})
