<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    handle: string
    first?: string
    last?: string
    after?: string
    before?: string
    sortKey?: string
    reverse?: string
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

const slider = ref<HTMLElement>()

const {
    initialized,
    isFirst,
    isLast,
    previous,
    next,
} = useSlider(slider)
</script>

<template>
    <div class="py-6 relative flex flex-wrap gap-y-10 gap-x-6 justify-center">
        <div
            ref="slider"
            class="flex overflow-x-auto overflow-y-visible gap-x-6 snap-x no-scrollbar"
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
                'cursor-pointer opacity-100': initialized && !isFirst,
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
                'cursor-pointer opacity-100': initialized && !isLast,
            }"
            @click="next"
        />
    </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
