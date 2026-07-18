<script setup lang="ts">
import type { ProductViewPayload } from '../../../module'

import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: ProductViewPayload
}>()

const analytics = useShopifyAnalytics()

const publish = () => {
  if (props.data.products.length) analytics.publish('product_viewed', props.data)
}

onMounted(publish)

watch(() => props.data.products.map(product => product.variantId ?? product.id).join(','), publish)
</script>

<template>
  <slot />
</template>
