<script setup lang="ts">
const products = await useFetch('/api/products', {
    params: {
        first: 1,
    },
})

console.log(products.data)
</script>

<template>
    <pre>{{ products.data.value?.data?.products }}</pre>
</template>
