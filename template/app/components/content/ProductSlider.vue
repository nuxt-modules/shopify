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
        <div class="prose mb-10 md:mb-14">
            <slot />
        </div>

        <div class="relative flex flex-wrap gap-y-10 gap-x-8 justify-center">
            <div
                ref="slider"
                class="flex overflow-x-auto overflow-y-visible gap-x-8 snap-x no-scrollbar"
            >
                <ProductCard
                    v-for="product in products"
                    :key="product.id"
                    :product="product"
                    class="shrink-0 snap-start"
                    :class="[
                        'w-full',
                        'sm:w-[calc(50%-16px)]',
                        'md:w-[calc(33.333333%-22px)]',
                    ]"
                />
            </div>

            <UButton
                icon="hugeicons:arrow-left-01"
                variant="soft"
                size="sm"
                class="transition-opacity opacity-0"
                :ui="{
                    base: 'rounded-full border border-primary',
                }"
                :class="{
                    'opacity-100': !isFirst,
                }"
                @click="previous"
            />

            <UButton
                icon="hugeicons:arrow-right-01"
                variant="soft"
                size="sm"
                class="transition-opacity opacity-0"
                :ui="{
                    base: 'rounded-full border border-primary',
                }"
                :class="{
                    'opacity-100': !isLast,
                }"
                @click="next"
            />
        </div>
    </div>
</template>
