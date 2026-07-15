<script setup lang="ts">
import type { SearchViewPayload } from '../../../module'

import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: SearchViewPayload
}>()

const analytics = useShopifyAnalytics()

onMounted(() => analytics.publish('search_viewed', props.data))

watch(() => props.data.searchTerm, () => analytics.publish('search_viewed', props.data))
</script>

<template>
  <slot />
</template>
