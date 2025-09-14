export default defineNuxtConfig({
    extends: ['docus'],

    modules: [
        '../src/module',
        '@nuxt/ui-pro',
        'motion-v/nuxt',
    ],

    app: {
        baseURL: '/shopify/',
    },

    css: ['~/assets/css/main.css'],

    site: {
        name: 'Nuxt Shopify',
        url: 'https://nuxt-modules.github.io',
    },

    runtimeConfig: {
        shopify: {
            name: 'nuxt-shopify-docs',

            clients: {
                storefront: {
                    apiVersion: '',
                    proxy: false,
                    mock: true,
                },
            },
        },
    },

    ogImage: {
        defaults: {
            url: '/logo-readme.jpg',
        },
    },
})
