<script setup lang="ts">
import type { MoneyV2 } from '#shopify/storefront'

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
}, {
    transform: data => data.collection,
})

const products = computed(() => flattenConnection(collection.value?.products))

const getPrice = (price: MoneyV2) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
}).format(Number(price.amount))
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
            <UPageCard
                v-for="product in products"
                :key="product.id"
                :to="`https://demostore.mock.shop/products/${product.handle}`"
                :title="product.title"
                :description="product.description"
                orientation="vertical"
                reverse
                :ui="{
                    description: 'line-clamp-2',
                    footer: 'w-full',
                }"
            >
                <template #header>
                    <NuxtImg
                        :src="product.featuredImage?.url"
                        :alt="product.featuredImage?.altText ?? product.title"
                        :width="product.featuredImage?.width ?? undefined"
                        :height="product.featuredImage?.height ?? undefined"
                        sizes="xs:100vw sm:50vw md:33vw lg:33vw xl:33vw"
                        class="rounded-sm"
                    />
                </template>

                <template #footer>
                    <div class="flex justify-between items-center w-full">
                        <div class="font-semibold">
                            from {{ getPrice(product.priceRange.minVariantPrice) }}
                        </div>

                        <UButton size="sm">
                            Add to Cart
                        </UButton>
                    </div>
                </template>
            </UPageCard>
        </div>
    </div>
</template>
