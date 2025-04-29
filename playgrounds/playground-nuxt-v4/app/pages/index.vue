<script setup lang="ts">
const products = await useFetch('/api/products', {
    query: {
        first: 10,
    },
})
</script>

<template>
    <pre>{{ products }}</pre>
</template>
