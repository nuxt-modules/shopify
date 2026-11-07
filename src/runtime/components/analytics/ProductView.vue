<script setup lang="ts">
import type { ProductViewPayload } from '@shopify/hydrogen'

import { AnalyticsEvent } from '@shopify/hydrogen'
import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: ProductViewPayload
}>()

const publish = () => {
  if (props.data.products.length) useShopifyAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, props.data)
}

onMounted(publish)

watch(() => props.data.products.map(product => product.variantId || product.id).join(','), publish)
</script>

<template>
  <slot />
</template>
