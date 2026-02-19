<script setup lang="ts">
const { data: products } = await useStorefrontData('async-data-test', `#graphql
    query FetchAsyncProducts(
        $handle: String,
        $after: String,
        $before: String,
        $first: Int,
        $last: Int,
    ) {
        collection(handle: $handle) {
            products(
                after: $after,
                before: $before,
                first: $first,
                last: $last,
            ) {
                edges {
                    cursor
                    node {
                        id
                        title
                        description
                    }
                }
            }
        }
    }
`, {
    variables: {
        handle: 'shirts',
        first: 5,
    },

    cache: 'short',

    transform: response => flattenConnection(response.collection?.products),
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

        <NuxtLink to="/client">Client</NuxtLink>
    </div>
</template>
