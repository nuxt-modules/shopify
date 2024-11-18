<script setup lang="ts">
const products = await useFetch('/api/products', {
    query: {
        first: 1,
    },
})
</script>

<template>
    <pre>{{ products }}</pre>
</template>
