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
    index,
    count,
    gap,
    perPage,
    slideWidth,

    isFirst,
    isLast,
    previous,
    next,
} = useSlider(slider)
</script>

<template>
    <div>
        <div class="prose mb-10 md:mb-14">
            <slot />
        </div>

        <div class="relative flex flex-wrap gap-y-10 gap-x-6 justify-center">
            <div
                ref="slider"
                gap="64"
                class="flex gap-16 overflow-x-auto overflow-y-hidden snap-x"
            >
                <ProductCard
                    v-for="product in products"
                    :key="product.id"
                    :product="product"
                    class="shrink-0 snap-start"
                    :class="[
                        'w-full',
                        'sm:w-[calc(50%-32px)]',
                        'md:w-[calc(33.333%-43px)]',
                    ]"
                />
            </div>

            <div class="flex w-full justify-center gap-6">
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
            </div>

            <div>
                <ul>
                    <li>index: {{ index }}</li>
                    <li>count: {{ count }}</li>
                    <li>gap: {{ gap }}</li>
                    <li>perPage: {{ perPage }}</li>
                    <li>slideWidth: {{ slideWidth }}</li>
                </ul>
            </div>
        </div>
    </div>
</template>
