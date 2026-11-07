export default defineNuxtConfig({
  extends: ['../../dev'],

  modules: [
    '../../src/module',
  ],

  runtimeConfig: {
    shopify: {
      name: '',
      shopId: '',
      storefrontId: '',

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
        subscriptions: [
          {
            topic: 'ORDERS_CREATE',
            uri: 'https://your-app.com/api/webhooks/test',
          },
        ],

        secret: '',
      },

      analytics: {
        consent: {
          mode: 'default-banner',
        },
      },
    },
  },

  compatibilityDate: '2026-03-15',
})
