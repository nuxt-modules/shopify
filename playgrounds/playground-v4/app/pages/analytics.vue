<script setup lang="ts">
const log = ref<string[]>([])

const product = {
  id: 'gid://shopify/Product/1',
  title: 'Demo Hoodie',
  vendor: 'Acme',
  price: { amount: '49.90', currencyCode: 'EUR' as const },
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Black / M',
  quantity: 1,
}

let removeDestination: (() => void) | undefined

onMounted(() => {
  removeDestination = useShopifyAnalytics()?.addDestination({
    name: 'playground-log',
    setup: ({ subscribe }) => subscribe('product_viewed', (payload) => {
      log.value.unshift(`viewed ${payload.products[0]?.title}`)
    }),
  })
})

onBeforeUnmount(() => removeDestination?.())
</script>

<template>
  <div>
    <ShopifyProductView :data="{ products: [product] }" />

    <h1>{{ product.title }}</h1>

    <ul>
      <li
        v-for="(entry, index) in log"
        :key="index"
      >
        {{ entry }}
      </li>
    </ul>
  </div>
</template>
