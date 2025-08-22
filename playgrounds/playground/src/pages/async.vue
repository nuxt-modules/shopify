<script type="setup" setup lang="ts">
const storefront = useStorefront()

const { data: products } = await useAsyncData('async-data-test', () => storefront.request(`#graphql
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
        first: 3,
    },
}), {
    transform: data => flattenConnection(data.data?.collection?.products),
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
