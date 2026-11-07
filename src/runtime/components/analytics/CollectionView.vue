<script setup lang="ts">
import type { CollectionViewPayload } from '@shopify/hydrogen'

import { AnalyticsEvent } from '@shopify/hydrogen'
import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: CollectionViewPayload
}>()

const publish = () => {
  if (props.data.collection.id) useShopifyAnalytics()?.publish(AnalyticsEvent.COLLECTION_VIEWED, props.data)
}

onMounted(publish)

watch(() => props.data.collection.id, publish)
</script>

<template>
  <slot />
</template>
