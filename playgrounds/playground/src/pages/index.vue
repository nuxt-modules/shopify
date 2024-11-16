<script setup lang="ts">
const products = await useFetch('/api/products', {
    params: {
        first: 1,

    }
})
const config = useRuntimeConfig()
</script>

<template>
    {{ products }}
    {{ config }}
</template>
