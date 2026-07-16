<script setup lang="ts">
import type { CartViewPayload } from '../../../module'

import { onMounted } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data?: CartViewPayload
}>()

const analytics = useShopifyAnalytics()

onMounted(() => {
  if (props.data?.cart) analytics.setCart(props.data.cart)

  analytics.publish('cart_viewed', props.data ?? {})
})
</script>

<template>
  <slot />
</template>
