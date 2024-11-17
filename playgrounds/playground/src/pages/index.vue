<script setup lang="ts">
const products = await useFetch('/api/products', {
    params: {
        first: 1,

    }
})
const config = useRuntimeConfig()
</script>

<template>
    <pre>{{ products }}</pre>
    <pre>{{ config }}</pre>
</template>
