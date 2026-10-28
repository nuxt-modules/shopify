<script setup lang="ts">
const { data: products } = await useFetch('/api/products', {
  query: {
    handle: 'tops',
    first: 3,
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
    <p>Product count: {{ products?.length }}</p>
  </div>
</template>
