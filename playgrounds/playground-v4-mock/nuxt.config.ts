export default defineNuxtConfig({
  extends: ['../../dev'],

  modules: [
    '../../src/module',
  ],

  runtimeConfig: {
    shopify: {
      clients: {
        storefront: {
          apiVersion: '',
        },
      },
    },
  },

  compatibilityDate: '2026-03-15',

  shopify: {
    name: 'mock-shop',

    clients: {
      storefront: {
        mock: true,
      },
    },
  },
})
