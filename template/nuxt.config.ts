// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['../dev'],

  modules: [
    '../src/module',
    '@nuxtjs/critters',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@nuxt/ui',
  ],

  css: ['~/assets/main.css'],

  ui: {
    colorMode: false,
  },

  runtimeConfig: {
    shopify: {
      name: 'nuxt-module-store',

      clients: {
        storefront: {
          apiVersion: '2026-04',
          publicAccessToken: '40d025de5a3421a960e8d7970b922901',
        },

        customerAccount: {
          apiVersion: '2026-04',
          clientId: '5d5e8bd8-ce5f-4cdb-9556-bf330ade1e9b',
        },
      },

      analytics: {
        storefrontId: '187932',

        consent: {
          banner: true,
        },
      },
    },
  },

  routeRules: {
    '/account/**': { headers: { 'cache-control': 'no-store' } },
    '/*/account/**': { headers: { 'cache-control': 'no-store' } },
  },

  compatibilityDate: '2026-08-09',

  fonts: {
    families: [
      {
        name: 'Source Sans 3',
        provider: 'google',
      },
    ],
  },

  i18n: {
    strategy: 'prefix_except_default',

    defaultLocale: 'en-us',

    locales: [
      {
        code: 'en-us',
        language: 'en',
        file: 'en.json',
      },
      {
        code: 'de-de',
        language: 'de',
        file: 'de.json',
      },
    ],
  },

  image: {
    provider: 'shopify',
  },
})
