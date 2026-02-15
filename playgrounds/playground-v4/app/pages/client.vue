<script setup lang="ts">
const storefront = useStorefront()

const { data } = await storefront.request(`#graphql
    query FetchFirstThreeProducts($first: Int) {
        products(first: $first) {
            nodes {
                ...ProductFields
            }
        }
    }
    ${PRODUCT_FRAGMENT}
`, {
    variables: {
        first: 5,
    },

    cache: {
        ttl: 1000 * 60 * 60, // 1 hour
        updateAgeOnGet: true,
    },
})

const products = flattenConnection(data?.products)
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

        <p>Product count: {{ products.length }}</p>

        <NuxtLink to="/async">Async</NuxtLink>
    </div>
</template>
