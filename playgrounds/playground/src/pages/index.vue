<script setup lang="ts">
const { data: products } = await useFetch('/api/products', {
    query: {
        handle: 'shirts',
        first: 5,
    },
})
</script>

<template>
    <div>
        <div
            v-for="product in products"
            :key="product.id"
        >
            <h2>{{ product.title }}</h2>
            <p>{{ product.description }}</p>
            <br>
        </div>
    </div>
</template>
