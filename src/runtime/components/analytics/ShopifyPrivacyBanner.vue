<script setup lang="ts">
import { useShopifyAnalytics } from '../../composables/analytics/client'

const analytics = useShopifyAnalytics()

const accept = () => analytics.setTrackingConsent({
  analytics: true,
  marketing: true,
  preferences: true,
  sale_of_data: true,
})

const decline = () => analytics.setTrackingConsent({
  analytics: false,
  marketing: false,
  preferences: false,
  sale_of_data: false,
})
</script>

<template>
  <slot
    :accept="accept"
    :decline="decline"
    :set-consent="analytics.setTrackingConsent"
    :can-track="analytics.canTrack"
  />
</template>
