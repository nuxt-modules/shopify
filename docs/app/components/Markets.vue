<script setup lang="ts">
const markets = ['United States', 'Germany', 'Austria', 'Spain']
</script>

<template>
  <div class="flex flex-col gap-4 py-1">
    <UCard
      v-for="market in markets"
      :key="market"
      :ui="{
        root: 'transition-all hover:ring-primary',
      }"
    >
      {{ market }}
    </UCard>
  </div>
</template>
