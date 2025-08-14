<script type="setup" setup lang="ts">
const storefront = useStorefront()

const PRODUCT_FRAGMENT = `#graphql
    fragment ProductFields on Product {
        id
        title
        description
    }
`

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
        <pre>{{ data?.products }}</pre>
    </div>
</template>
