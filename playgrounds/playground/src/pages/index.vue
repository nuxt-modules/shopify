<script setup lang="ts">
import { useFetch } from '#imports'

const { data } = await useFetch('/api/products', {
    query: {
        first: 10,
    },
})
</script>

<template>
    <pre>{{ data }}</pre>
</template>
