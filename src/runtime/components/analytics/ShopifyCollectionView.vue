<script setup lang="ts">
import type { CollectionViewPayload } from '../../../module'

import { onMounted, watch } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  data: CollectionViewPayload
}>()

const analytics = useShopifyAnalytics()

const publish = () => {
  if (props.data.collection.id) analytics.publish('collection_viewed', props.data)
}

onMounted(publish)

watch(() => props.data.collection.id, publish)
</script>

<template>
  <slot />
</template>
