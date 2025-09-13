export default defineNuxtConfig({
    extends: ['docus'],

    modules: [
        '../src/module',
        '@nuxt/ui-pro',
    ],

    css: ['~/assets/css/main.css'],

    site: {
        name: 'Nuxt Shopify',
    },

    runtimeConfig: {
        shopify: {
            name: 'nuxt-shopify-docs',

            clients: {
                storefront: {
                    apiVersion: '',
                    mock: true,
                },
            },
        },
    },

})
