<script setup lang="ts">
import type { ShopifyAnalyticsCart } from '../../../module'

import { onMounted } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'
import { toAnalyticsCart } from '../../utils/analytics/cart'

const props = defineProps<{
  cart?: ShopifyAnalyticsCart | null
}>()

const analytics = useShopifyAnalytics()

onMounted(() => {
  const cart = props.cart ?? analytics.cart.value

  analytics.publish('cart_viewed', { cart: cart ? toAnalyticsCart(cart) : null })
})
</script>

<template>
  <slot />
</template>
