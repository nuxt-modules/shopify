<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    handle: string
    first?: number
    last?: number
    after?: string
    before?: string
    sortKey?: string
    reverse?: boolean
    filters?: ProductFilter[]
}>()

const { language, country } = useLocalization()
const { locale } = useI18n()

const key = computed(() => `product-slider-${props.handle}-${locale.value}`)

const first = computed(() => props.first ? Number(props.first) : undefined)
const last = computed(() => props.last ? Number(props.last) : undefined)
const after = computed(() => props.after ? String(props.after) : undefined)
const before = computed(() => props.before ? String(props.before) : undefined)

const sortKey = computed(() => props.sortKey ? String(props.sortKey) : undefined)
const reverse = computed(() => props.reverse ? Boolean(props.reverse) : undefined)
const filters = computed(() => props.filters ? props.filters : undefined)

const { data: products } = await useStorefrontData(key, `#graphql
    query FetchSliderCollection(
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
    variables: z.object({
        handle: z.string(),
    }).extend(productConnectionParamsSchema.shape).extend(localizationParamsSchema.shape).parse({
        handle: props.handle,
        first: first.value,
        last: last.value,
        after: after.value,
        before: before.value,
        sortKey: sortKey.value,
        reverse: reverse.value,
        filters: filters.value,
        language: language.value,
        country: country.value,
    }),
    transform: data => flattenConnection(data?.collection?.products),
})
</script>

<template>
    <UCarousel
        v-slot="{ item: product }"
        :items="products"
        class="w-full mb-6"
        :ui="{ item: 'md:basis-1/2 lg:basis-1/3' }"
        arrows
        loop
    >
        <ProductCard :product="product" />
    </UCarousel>
</template>
