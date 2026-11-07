<script setup lang="ts">
import type { SearchViewPayload } from '@shopify/hydrogen'

import { AnalyticsEvent } from '@shopify/hydrogen'
import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: SearchViewPayload
}>()

const publish = () => {
  if (props.data.searchTerm) useShopifyAnalytics()?.publish(AnalyticsEvent.SEARCH_VIEWED, props.data)
}

onMounted(publish)

watch(() => JSON.stringify([props.data.searchTerm, props.data.searchResults]), publish)
</script>

<template>
  <slot />
</template>
