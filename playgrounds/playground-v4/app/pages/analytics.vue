<script setup lang="ts">
const analytics = useShopifyAnalytics()

const log = ref<string[]>([])
const quantity = ref(0)

const product = {
  id: 'gid://shopify/Product/1',
  title: 'Demo Hoodie',
  vendor: 'Acme',
  price: { amount: '49.90', currencyCode: 'EUR' as const },
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Black / M',
  quantity: 1,
}

const removeDestination = analytics.addDestination({
  name: 'playground-log',
  setup: ({ subscribe }) => subscribe('product_added_to_cart', (payload) => {
    log.value.unshift(`added ${payload.currentLine?.merchandise.product.title}`)
  }),
})

onBeforeUnmount(removeDestination)

const addToCart = () => {
  quantity.value++

  analytics.setCart({
    id: 'gid://shopify/Cart/1',
    updatedAt: new Date().toISOString(),
    lines: {
      nodes: [{
        id: 'gid://shopify/CartLine/1',
        quantity: quantity.value,
        cost: { amountPerQuantity: product.price },
        merchandise: {
          id: product.variantId,
          title: product.variantTitle,
          product: { id: product.id, title: product.title, vendor: product.vendor },
        },
      }],
    },
  })
}
</script>

<template>
  <div>
    <ShopifyProductView :data="{ products: [product] }" />

    <h1>{{ product.title }}</h1>

    <p>Can track: {{ analytics.canTrack() }}</p>
    <p>Shop: {{ analytics.shop.value }}</p>
    <p>Market: {{ analytics.i18n.value }}</p>

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
