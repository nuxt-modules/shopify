<script setup lang="ts">
const props = defineProps<{
    handle: string
}>()

const key = `collection-${props.handle}`

const { data: collection } = await useAsyncStorefront(key, `#graphql
    query GetCollection(
        $handle: String!, 
        $first: Int, 
        $last: Int, 
        $after: String, 
        $before: String, 
        $language: LanguageCode, 
        $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
        collection(handle: $handle) {
            ...CollectionFields

            products(first: $first, last: $last, after: $after, before: $before) {
                ...ProductConnectionFields
            }
        }
    }
    ${COLLECTION_FRAGMENT}
    ${PRODUCT_CONNECTION_FRAGMENT}
`, {
    variables: {
        handle: props.handle,
        first: 4,
        language: 'EN',
        country: 'US',
    },
    transform: data => data.collection,
})

const products = computed(() => flattenConnection(collection.value?.products))
</script>

<template>
    <div>
        <p class="mb-4 text-2xl font-bold">
            {{ collection?.title }}
        </p>

        <p class="mb-6">
            {{ collection?.description }}
        </p>

        <div class="grid gap-4 grid-cols-1 sm:gap-8 md:grid-cols-2">
            <ProductCard
                v-for="product in products"
                :key="product.id"
                :product="product"
            />
        </div>
    </div>
</template>
