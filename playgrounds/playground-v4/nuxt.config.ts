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
                        topic: 'THEMES_UPDATE',
                        uri: '/api/webhooks/themes-update',
                        filter: '',
                    },
                ],

                secret: '',
            },
        },
    },

    compatibilityDate: '2025-11-01',
})
