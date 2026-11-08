<script setup lang="ts">
import type { CartDataFromHandlers, CartGetData, CartServerHandlers } from '@shopify/hydrogen'

import * as locales from '@nuxt/ui/locale'

import { CartProvider } from '~/utils/cart'

const { shopify: { shopName } } = useAppConfig()
const { localeProperties } = useI18n()
const { language } = useLocalization()
const route = useRoute()

const { data: cart } = await useFetch<CartGetData<CartDataFromHandlers<CartServerHandlers>>>('/api/cart', {
  key: 'cart',
  immediate: !!route.meta.cart,
})

if (import.meta.server && route.meta.cart) useResponseHeader('cache-control').value = 'private, no-store'

const uiLocale = computed(() => Object.values(locales).find(locale => locale.code === language.value) ?? locales.en)

useHead({
  htmlAttrs: {
    lang: () => localeProperties.value.language,
    dir: () => uiLocale.value.dir,
  },

  title: shopName,

  meta: [
    { property: 'og:image', content: 'https://shopify.nuxtjs.org/logo-readme.jpg' },
    { property: 'og:image:type', content: 'image/jpeg' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: 'https://shopify.nuxtjs.org/logo-readme.jpg' },
    { name: 'twitter:image:src', content: 'https://shopify.nuxtjs.org/logo-readme.jpg' },
    { property: 'og:image:width', content: '1200' },
    { name: 'twitter:image:width', content: '1200' },
    { property: 'og:image:height', content: '600' },
    { name: 'twitter:image:height', content: '600' },
  ],
})
</script>

<template>
  <UApp :locale="uiLocale">
    <CartProvider :initial-data="cart ?? undefined">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </CartProvider>
  </UApp>
</template>
