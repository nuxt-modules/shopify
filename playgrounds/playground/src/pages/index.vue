<script setup lang="ts">
const products = await useFetch('/api/products')
const config = useRuntimeConfig()
</script>

<template>
    {{ products }}
    {{ config }}
</template>