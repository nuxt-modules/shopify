export default defineNuxtConfig({
  extends: ['../../dev'],

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
          clientId: '',
          clientSecret: '',
        },
      },
    },
  },

  srcDir: 'app/',

  serverDir: 'server/',

  compatibilityDate: '2026-03-15',
})
