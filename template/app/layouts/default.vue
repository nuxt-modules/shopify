<script setup lang="ts">
import { useCartAnalytics } from '@shopify/hydrogen/vue'

useCartAnalytics()
</script>

<template>
  <div>
    <AppHeader />

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>
