import type { NuxtConfig } from 'nuxt/schema'

import { readFileSync } from 'node:fs'
import { localHttps } from '@shopify/hydrogen/vite'

type VitePlugin = NonNullable<NonNullable<NuxtConfig['vite']>['plugins']>[number]

const httpsPlugin = localHttps({
  enabled: process.env.npm_lifecycle_event === 'dev:https',
})

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.resolve('@nuxtjs/shopify')), 'utf8'))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/shopify',
    './modules/markets',
    '@nuxtjs/critters',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@nuxt/ui',
  ],

  css: ['~/assets/main.css'],

  ui: {
    colorMode: false,
  },

  appConfig: {
    shopify: {
      version,
    },
  },

  runtimeConfig: {
    shopify: {
      name: 'nuxt-module-store',

      storefrontId: '187932',

      routeTemplates: {
        productInCollection: '/products/:productHandle',
      },

      clients: {
        storefront: {
          apiVersion: '2026-10',
          publicAccessToken: '40d025de5a3421a960e8d7970b922901',
        },

        customerAccount: {
          apiVersion: '2026-10',
          clientId: '5d5e8bd8-ce5f-4cdb-9556-bf330ade1e9b',
        },
      },

      analytics: {
        consent: {
          mode: 'default-banner',
        },
      },
    },
  },

  routeRules: {
    '/account/**': { headers: { 'cache-control': 'no-store' } },
    '/*/account/**': { headers: { 'cache-control': 'no-store' } },
  },

  devServer: httpsPlugin.api.getDevServerConfig(),

  compatibilityDate: '2026-08-09',

  vite: {
    plugins: [httpsPlugin as VitePlugin],
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
  },

  image: {
    provider: 'shopify',
  },
})
