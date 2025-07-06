<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
    handle: string
    first: string
}>()

const { country, language, key: translationKey } = useTranslation()
const storefront = useStorefront()

const key = computed(() => `product-slider-${props.handle}-${translationKey.value}`)

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
    variables: z.object({
        handle: z.string(),
        first: z.preprocess(v => Number(v ?? 0), z.number().int().min(1).max(250)),
    }).merge(localizationParamsSchema).parse({
        ...props,
        language: language.value,
        country: country.value,
    }),
}), {
    transform: data => data.data?.collection?.products?.edges || [],
})
</script>

<template>
    <div>
        <div class="prose mb-10 md:mb-14">
            <slot />
        </div>

        <div class="flex gap-16">
            <ProductCard
                v-for="product in products"
                :key="product.node.id"
                :product="product.node"
                class="w-[300px] shrink-0"
            />
        </div>
    </div>
</template>
