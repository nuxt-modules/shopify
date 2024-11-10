<script setup lang="ts">
const shopify = useShopify()

const products = await shopify.admin.request(`
    #graphql
    query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
            nodes {
                id
                title
                descriptionHtml
            }
        }
    }
`, {
    first: 10,
    after: null,
})
</script>

<template>
    <pre>{{ products }}</pre>
</template>
