<script setup lang="ts">
const localePath = useLocalePath()

await navigateTo(localePath('/account/orders'), { replace: true })
</script>

<template>
  <div />
</template>
