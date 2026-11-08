<script setup lang="ts">
const { shopify: { version } } = useAppConfig()
</script>

<template>
  <p class="pb-2 pe-3 md:pb-4">
    <span class="text-sm text-muted">
      {{ $t('footer.builtWith') }}
    </span>

    <br>

    <span class="font-medium">
      Nuxt Shopify v{{ version }}
    </span>
  </p>
</template>
