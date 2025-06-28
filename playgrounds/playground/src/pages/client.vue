<script type="setup" setup lang="ts">
const storefront = useStorefront()

const { data } = await storefront.request(`#graphql
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
})
</script>

<template>
    <div>
        <pre>{{ data?.products }}</pre>
    </div>
</template>
