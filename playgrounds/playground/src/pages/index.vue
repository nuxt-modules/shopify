<script setup lang="ts">
import { useFetch } from '#imports'

const products = await useFetch('/api/products', {
    query: {
        first: 1,
    },
})
</script>

<template>
    <pre>{{ products }}</pre>
</template>
