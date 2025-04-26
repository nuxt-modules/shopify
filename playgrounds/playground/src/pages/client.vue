<script type="setup" setup lang="ts">
const storefront = useStorefront()

const { data } = await useAsyncData('products', async () => await storefront.request(`#graphql
    query FetchFirstThreeProducts($first: Int) {
        products(first: $first) {
            nodes {
                id
                title
                description
            }
        }
    }
`, {
    variables: {
        first: 3,
    },
}), { transform: data => data?.data?.products.nodes })
</script>

<template>
    <div>
        <pre>{{ data }}</pre>
    </div>
</template>
