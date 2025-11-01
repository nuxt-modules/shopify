---
seo:
  title: 'Create your Shopify store with Nuxt'
  description: Easily integrate and use Shopify in your Nuxt 3 or 4 app.
---

::products-marquee
::

::u-page-hero
#title
[Nuxt]{.text-primary} Shopify

#description
Plug & play Shopify integration for Nuxt 3 & 4

#links
  :::u-button
  ---
  size: xl
  to: /getting-started/introduction
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-lucide-star
  size: xl
  target: _blank
  to: https://github.com/nuxt-modules/shopify
  variant: subtle
  ---
  Star on GitHub
  :::
::

::component-hero
---
title: Minimal API for your Storefront
---

#component
::product-image
---
handle: hoodie-old
sizes: xs:545px sm:545px md:545px lg:392px xl:392px
class: w-full aspect-square
---
::

#component-title
ProductImage.vue

#default
  :::code-tree{default-value="app/components/ProductImage.vue"}
  ```vue [app/components/ProductImage.vue]
  <script setup lang="ts">
  const props = defineProps<{
    handle: string
  }>()

  const { data } = await useStorefrontData('product', `#graphql
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        featuredImage {
          url
        }
      }
    }
  `, {
    variables: props,
  })
  </script>

  <template>
    <NuxtImg :src="data?.product?.featuredImage?.url" />
  </template>
  ```

  ```ts [nuxt.config.ts]
  export default defineNuxtConfig({
    modules: ['@nuxtjs/shopify'],

    shopify: {
      name: 'store-name',

      clients: {
        storefront: {
          publicAccessToken: 'public-access-token',
          apiVersion: '2025-07',
        },
      },
    },
  })
  ```

  ```json [package.json]
  {
    "name": "nuxt-shopify-store",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "nuxt dev",
      "build": "nuxt build",
      "generate": "nuxt generate",
      "preview": "nuxt preview"
    },
    "dependencies": {
      "@nuxtjs/shopify": "latest",
      "nuxt": "latest"
    }
  }
  ```
  :::
::

::component-hero
---
title: Easy integration with the Admin API
---

#component
::markets
::

#component-title
Markets.vue

#default 
  :::code-tree{default-value="server/api/admin/markets.ts"}
  ```vue [app/components/Markets.vue]
  <script setup lang="ts">
  const { data } = await useFetch('/api/admin/markets')
  </script>

  <template>
    <div class="flex flex-col gap-4">
      <UCard v-for="market in data" :key="market.name">
        {{ market.name }}
      </UCard>
    </div>
  </template>
  ```

  ```ts [server/api/admin/markets.ts]
  export default defineEventHandler(async () => {
    const admin = useAdmin()

    const { data } = await admin.request(`#graphql
      query GetMarkets {
        markets(first: 4) {
          nodes {
            ...MarketFields
          }
        }
      }
      ${MARKET_FRAGMENT}
    `)

    return flattenConnection(data?.markets)
  })
  ```

  ```ts [graphql/admin/market.ts]
  export const MARKET_FRAGMENT = `#graphql
    fragment MarketFields on Market {
      name
      webPresence {
        rootUrls {
          locale
          url
        }
      }
    }
  `
  ```

  ```ts [nuxt.config.ts]
  export default defineNuxtConfig({
    modules: ['@nuxtjs/shopify'],

    shopify: {
      name: 'store-name',

      clients: {
        admin: {
          accessToken: 'public-access-token',
          apiVersion: '2025-07',
        },
      },
    },
  })
  ```

  ```json [package.json]
  {
    "name": "nuxt-shopify-store",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "nuxt dev",
      "build": "nuxt build",
      "generate": "nuxt generate",
      "preview": "nuxt preview"
    },
    "dependencies": {
      "@nuxtjs/shopify": "latest",
      "nuxt": "latest"
    }
  }
  ```
  :::
::

::u-page-section
#title
Build your Shopify store with Nuxt

#features
  :::u-page-feature
  ---
  icon: i-simple-icons-nuxt
  target: _blank
  to: https://nuxt.com
  ---
  #title
  Module for [Nuxt 3 & 4]{.text-primary}
  
  #description
  Optimized for the most famous Vue framework. Nuxt Shopify gives you everything you need to build fast, performant, and SEO-friendly shops.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-store
  to: /essentials/storefront
  ---
  #title
  Full [Storefront API]{.text-primary} Support
  
  #description
  Access products, collections, customers, and more with the Shopify Storefront API. Perfect for building custom shopping experiences.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-shield
  to: /essentials/admin
  ---
  #title
  Secure [Admin API]{.text-primary} Access

  #description
  Manage orders, inventory, and other store data securely with the Shopify Admin API. Ideal for building custom admin dashboards and tools.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-wand-sparkles
  to: /essentials/codegen
  ---
  #title
  Zero-config [Code Generation]{.text-primary}

  #description
  Generates and hot-reloads TypeScript types from your GraphQL operations, for reliable typing and autocompletion.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bug
  to: /essentials/error-handling
  ---
  #title
  Robust [Error Handling]{.text-primary}

  #description
  Use built-in error handling utilities to manage and respond to API errors gracefully. Third-party logging-compatible.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-between-horizontal-start
  to: /going-further/hooks
  ---
  #title
  Extendable [Lifecycle Hooks]{.text-primary}

  #description
  Customize and extend the module's behavior with lifecycle hooks. Add custom logic at various stages of API interaction.
  :::
::
