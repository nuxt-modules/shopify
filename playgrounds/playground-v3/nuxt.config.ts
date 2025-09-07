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
                },
            },
        },
    },

    srcDir: 'src/',

    compatibilityDate: '2025-08-22',

    shopify: {
        autoImports: {
            admin: false,
        },
    },
})
