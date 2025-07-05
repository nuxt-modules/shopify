<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
    handle: string
    first: string
    country: CountryCode
    language: LanguageCode
}>()

const storefront = useStorefront()

const variables = z.object({
    handle: z.string(),
    first: z.preprocess(v => Number(v ?? 0), z.number().int().min(1).max(250)),
}).merge(localizationParamsSchema).parse(props)

const key = computed(() => `product-slider-${variables.handle}-${variables.language}-${variables.country}`)

const { data: products } = await useAsyncData(key, async () => await storefront.request(`#graphql
    query FetchSliderProducts(
        $handle: String,
        $after: String,
        $before: String,
        $first: Int,
        $last: Int,
        $language: LanguageCode,
        $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
        collection(handle: $handle) {
            products(
                after: $after,
                before: $before,
                first: $first,
                last: $last,
            ) {
                ...ProductConnectionFields
            }
        }
    }
    ${IMAGE_FRAGMENT}
    ${PRICE_FRAGMENT}
    ${PRODUCT_CONNECTION_FRAGMENT}
`, {
    variables,
}), {
    transform: data => data.data?.collection?.products?.edges || [],
})
</script>

<template>
    <div class="my-16 md:mt-24">
        <div class="prose mb-14">
            <slot />
        </div>

        <div class="flex gap-12">
            <ProductCard
                v-for="product in products"
                :key="product.node.id"
                :product="product.node"
                class="w-full"
            />
        </div>
    </div>
</template>
