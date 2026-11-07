<script setup lang="ts">
import type { CartState } from '@shopify/hydrogen'

import { AnalyticsEvent } from '@shopify/hydrogen'
import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'
import { isCartSettled, toAnalyticsCart } from '../../utils/analytics/cart'

const props = defineProps<{
  cart: CartState
}>()

onMounted(() => {
  let reported = false

  watch(() => isCartSettled(props.cart), (settled) => {
    if (reported || !settled) return

    reported = true

    useShopifyAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, { cart: toAnalyticsCart(props.cart.data) })
  }, { immediate: true })
})
</script>

<template>
  <slot />
</template>
