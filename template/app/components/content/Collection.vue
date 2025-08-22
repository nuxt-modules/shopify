<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
    handle: string
}>()

const storefront = useStorefront()
const { params } = useCollection()
const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const { data, status } = await useAsyncData(`collection-${locale.value}-${props.handle}-products`, async () => await storefront.request(`#graphql
    query FetchListing(
        $handle: String,
        $after: String,
        $before: String,
        $first: Int,
        $last: Int,
        $sortKey: ProductCollectionSortKeys,
        $reverse: Boolean,
        $filters: [ProductFilter!],
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
                reverse: $reverse,
                sortKey: $sortKey,
                filters: $filters
            ) {
                ...ProductConnectionFields
                ...ProductFilterFields
            }
        }
    }
    ${PRODUCT_CONNECTION_FRAGMENT}
    ${PRODUCT_FILTERS_FRAGMENT}
    ${IMAGE_FRAGMENT}
    ${PRICE_FRAGMENT}
`, {
    variables: z.object({
        handle: z.string(),
        filters: productFilterSchema.optional(),
    }).extend(connectionParamsSchema.shape).extend(localizationParamsSchema.shape).parse({
        handle: props.handle,
        ...params.value,
    }),
}), {
    transform: response => response.data,
    watch: [() => props.handle, params, locale],
})

const products = computed(() => data.value?.collection?.products)
const filters = computed(() => products.value?.filters)

const toTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    })
}

const loadPrevious = async () => {
    route.query.after = null
    route.query.before = products.value?.pageInfo.startCursor ?? null

    await router.push({ query: {
        ...route.query,
        before: products.value?.pageInfo.startCursor,
        after: undefined,
        first: undefined,
        last: 12,
    } })

    toTop()
}

const loadNext = async () => {
    await router.push({ query: {
        ...route.query,
        before: undefined,
        after: products.value?.pageInfo.endCursor,
        first: 12,
        last: undefined,
    } })

    toTop()
}

watch(locale, () => {
    route.query.first = null
    route.query.last = null

    toTop()
})
</script>

<template>
    <div class="lg:grid lg:grid-cols-12">
        <Filters
            v-if="filters?.length"
            :filters="filters"
            class="lg:col-span-4 xl:col-span-3"
        />

        <div class="not-prose my-12 lg:my-14 lg:col-span-8 xl:col-span-9">
            <div
                v-if="products?.pageInfo.hasPreviousPage"
                class="flex w-full justify-center pb-8 md:mb-8"
            >
                <UButton
                    variant="soft"
                    color="primary"
                    class="cursor-pointer"
                    icon="hugeicons:arrow-up-01"
                    @click="loadPrevious"
                >
                    {{ t('pagination.previous') }}
                </UButton>
            </div>

            <div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3">
                <ProductCard
                    v-for="product in flattenConnection(products)"
                    :key="product.id"
                    :product="product"
                    class="pb-14 border-b border-b-[var(--ui-border)]"
                />
            </div>

            <div
                v-if="products?.pageInfo.hasNextPage"
                class="flex w-full justify-center mt-14"
            >
                <UButton
                    variant="soft"
                    color="primary"
                    class="cursor-pointer"
                    icon="hugeicons:arrow-down-01"
                    @click="loadNext"
                >
                    {{ t('pagination.next') }}
                </UButton>
            </div>

            <div
                v-if="status === 'pending'"
                class="flex justify-center pt-8"
            >
                Loading...
            </div>

            <div
                v-else-if="!products || products.edges.length === 0"
                class="flex flex-col justify-center items-center col-span-full text-center"
            >
                <div class="flex items-center pb-2 gap-2">
                    <UIcon
                        name="hugeicons:alert-01"
                        class="text-dimmed size-6"
                    />

                    <p class="text-xl text-dimmed">
                        No products found
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
