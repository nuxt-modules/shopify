export default defineNuxtConfig({
  modules: [
    '../../src/module',
    'nuxt-auth-utils',
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
          clientId: '',
          clientSecret: '',
        },

        customerAccount: {
          apiVersion: '',
          clientId: '',
        },
      },

      webhooks: {
        hooks: [
          {
            topic: 'ORDERS_CREATE',
            uri: 'https://shopify.nuxtjs.org/api/webhooks/orders-create',
          },
        ],

        secret: '',
      },
    },
  },

  compatibilityDate: '2026-03-15',
})
