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
        clients: {
            storefront: {
                documents: [
                    '!**/admin/**.{js,ts,graphql,gql}',
                ],
            },

            admin: {
                documents: [
                    '**/admin/**.{js,ts,graphql,gql}',
                ],
            },
        },

        autoImports: {
            admin: false,
        },
    },
})
