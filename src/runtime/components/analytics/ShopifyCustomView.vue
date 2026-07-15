<script setup lang="ts">
import { onMounted } from 'vue'
import { useShopifyAnalytics } from '../../composables/analytics/client'

const props = defineProps<{
  event: string
  data?: Record<string, unknown>
}>()

const analytics = useShopifyAnalytics()

onMounted(() => {
  const name = props.event.startsWith('custom_') ? props.event : `custom_${props.event}`

  analytics.publish(name as `custom_${string}`, props.data ?? {})
})
</script>

<template>
  <slot />
</template>
