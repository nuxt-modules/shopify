<script setup lang="ts">
const { data: products } = await useFetch('/api/products', {
    query: {
        first: 5,
    },
})
</script>

<template>
    <div>
        <div
            v-for="product in products?.data?.products.nodes"
            :key="product.id"
        >
            <h2>{{ product.title }}</h2>
            <p>{{ product.description }}</p>
            <br>
        </div>
        <p>Product count: {{ products?.data?.products.nodes.length }}</p>
    </div>
</template>
