<script setup lang="ts">
const analytics = useShopifyAnalytics()

const log = ref<string[]>([])

const apiLoaded = ref(false)
const canTrack = ref(false)

const refresh = () => {
  apiLoaded.value = !!(window as unknown as { Shopify?: { customerPrivacy?: unknown } }).Shopify?.customerPrivacy
  canTrack.value = analytics.canTrack()
}

onMounted(() => {
  refresh()
  const interval = setInterval(refresh, 1000)
  onBeforeUnmount(() => clearInterval(interval))
})

analytics.subscribe('product_added_to_cart', (payload) => {
  if (!payload.currentLine) return

  log.value.unshift(`added ${payload.currentLine.merchandise.product.title}`)
})

const product = {
  id: 'gid://shopify/Product/1',
  title: 'Demo Hoodie',
  vendor: 'Acme',
  price: '49.90',
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Black / M',
}

const addToCart = () => {
  analytics.publish('product_added_to_cart', {
    cart: { id: 'gid://shopify/Cart/1', lines: [] },
    currentLine: {
      id: 'gid://shopify/CartLine/1',
      quantity: 1,
      merchandise: {
        id: product.variantId,
        title: product.variantTitle,
        price: { amount: product.price },
        product: { id: product.id, title: product.title, vendor: product.vendor },
      },
    },
  })
}
</script>

<template>
  <div>
    <ShopifyProductView :data="{ products: [product] }" />

    <h1>{{ product.title }}</h1>

    <p>Consent API loaded: {{ apiLoaded }}</p>
    <p>Can track: {{ canTrack }}</p>
    <p>Shop identity: {{ analytics.shop.value }}</p>

    <button @click="addToCart">
      Add to cart
    </button>

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
