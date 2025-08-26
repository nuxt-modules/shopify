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
        first: 3,
    },
})
</script>

<template>
    <div>
        <div
            v-for="product in flattenConnection(data?.products)"
            :key="product.id"
        >
            <h2>{{ product.title }}</h2>
            <p>{{ product.description }}</p>
            <br>
        </div>
    </div>
</template>
