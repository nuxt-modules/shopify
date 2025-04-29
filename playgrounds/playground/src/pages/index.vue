<script setup lang="ts">
const response = await useFetch('/api/products', {
    query: {
        first: 5,
    },
})
</script>

<template>
    <pre>{{ response }}</pre>
</template>
