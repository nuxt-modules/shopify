// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
          mock: true,
          apiVersion: '2026-04',
        },

        customerAccount: {
          apiVersion: '2026-04',
          clientId: '',
        },
      },

      analytics: {
        storefrontId: '',

        consent: {
          withPrivacyBanner: true,
        },
      },
    },
  },

  compatibilityDate: '2026-03-15',

  vite: {
    server: {
      allowedHosts: [
        '.vercel.app',
      ],
    },
  },

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
