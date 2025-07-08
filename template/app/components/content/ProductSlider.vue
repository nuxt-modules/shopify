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
    transform: response => flattenConnection(response.data?.collection?.products),
})

const slider = ref<HTMLElement>()

const {
    isFirst,
    isLast,
    previous,
    next,
} = useSlider(slider)
</script>

<template>
    <div>
        <UContainer class="prose mb-10 md:mb-14">
            <slot />
        </UContainer>

        <UContainer class="relative flex flex-wrap gap-y-10 gap-x-6 justify-center !px-0">
            <div
                ref="slider"
                class="flex overflow-x-auto overflow-y-hidden snap-x"
            >
                <ProductCard
                    v-for="product in products"
                    :key="product.id"
                    :product="product"
                    class="shrink-0 snap-start px-4 md:px-6 lg:px-8"
                    :class="[
                        'w-full',
                        'sm:w-1/2',
                        'md:w-1/3',
                    ]"
                />
            </div>

            <UButton
                v-if="!isFirst"
                icon="hugeicons:arrow-left-01"
                variant="soft"
                size="sm"
                :ui="{
                    base: 'rounded-full border border-primary',
                }"
                @click="previous"
            />

            <UButton
                v-if="!isLast"
                icon="hugeicons:arrow-right-01"
                variant="soft"
                size="sm"
                :ui="{
                    base: 'rounded-full border border-primary',
                }"
                @click="next"
            />
        </UContainer>
    </div>
</template>
