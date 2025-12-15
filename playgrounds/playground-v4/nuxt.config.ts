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

            webhooks: {
                hooks: [
                    {
                        topic: 'ORDERS_CREATE',
                        uri: 'https://shopify.nuxtjs.org/api/webhooks/themes-update',
                    },
                ],

                secret: '',
            },
        },
    },

    compatibilityDate: '2025-11-01',
})
