<script setup lang="ts">
import type { CollectionViewPayload } from '../../../module'

import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: CollectionViewPayload
}>()

const analytics = useShopifyAnalytics()

onMounted(() => analytics.publish('collection_viewed', props.data))

watch(() => props.data.collection.id, () => analytics.publish('collection_viewed', props.data))
</script>

<template>
  <slot />
</template>
