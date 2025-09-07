<script setup lang="ts">
const storefront = useStorefront()

const { data } = await storefront.request(`#graphql
    query FetchProductsWithError($first: Int, $after: String) {
        products(first: $first, after: $after) {
            nodes {
                ...ProductFields
            }
        }
    }
    ${PRODUCT_FRAGMENT}
`, {
    variables: {
        first: 5,
        after: 'invalid_cursor',
    },
})

const products = flattenConnection(data?.products)
</script>

<template>
    <div>
        <p>Product count: {{ products?.length }}</p>
    </div>
</template>
