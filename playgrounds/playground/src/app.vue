<script setup lang="ts">
const products = await useFetch('/api/products')
const a = useRuntimeConfig()
</script>

<template>
    <pre>{{ products }}</pre>
    <pre>{{ a }}</pre>
</template>
