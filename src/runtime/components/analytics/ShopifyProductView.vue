<script setup lang="ts">
import type { ProductViewPayload } from '../../../module'

import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: ProductViewPayload
}>()

const analytics = useShopifyAnalytics()

onMounted(() => analytics.publish('product_viewed', props.data))

watch(
  () => props.data.products.map(product => product.variantId ?? product.id).join(','),
  () => analytics.publish('product_viewed', props.data),
)
</script>

<template>
  <slot />
</template>
