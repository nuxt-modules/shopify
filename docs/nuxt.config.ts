export default defineNuxtConfig({
  extends: ['docus', '../dev'],

  modules: [
    '../src/module',
    '@nuxt/ui',
    '@nuxtjs/critters',
    'motion-v/nuxt',
  ],

  app: {
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: '/icon.png',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  site: {
    name: 'Nuxt Shopify',
    url: 'https://shopify.nuxtjs.org',
  },

  content: {
    build: {
      markdown: {
        highlight: {
          langs: ['bash', 'diff', 'json', 'js', 'ts', 'html', 'css', 'vue', 'shell', 'mdc', 'md', 'yaml', 'graphql'],
        },
      },
    },
  },

  runtimeConfig: {
    shopify: {
      name: 'nuxt-module-store',

      clients: {
        storefront: {
          proxy: false,
          publicAccessToken: '40d025de5a3421a960e8d7970b922901',
        },
      },
    },
  },

  routeRules: {
    '/essentials/codegen': { redirect: '/going-further/codegen' },
    '/essentials/webhooks': { redirect: '/going-further/webhooks' },
    '/going-further/sandbox': { redirect: '/going-further/explorer' },
    '/recipes/navigation-tree': { redirect: '/examples/navigation-tree' },
    '/recipes/collection-page': { redirect: '/examples/collection-page' },
    '/recipes/collection-filters': { redirect: '/examples/collection-filters' },
    '/recipes/product-page': { redirect: '/examples/product-page' },
    '/recipes/cart': { redirect: '/examples/cart' },
    '/recipes': { redirect: '/examples' },
  },

  image: {
    format: ['avif', 'webp'],

    provider: 'shopify',

    domains: ['cdn.shopify.com'],
  },

  llms: {
    domain: 'shopify.nuxtjs.org',
  },

  ogImage: {
    defaults: {
      url: '/logo-readme.jpg',
    },
  },
})
