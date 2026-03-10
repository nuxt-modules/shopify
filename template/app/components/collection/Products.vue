<script setup lang="ts">
const props = defineProps<{
    handle: string
}>()

const { params } = useCollection()
const { locale } = useI18n()
const router = useRouter()
const route = useRoute()

const key = computed(() => `collection-${locale.value}-${props.handle}-products`)

const { data: collection, status } = await useStorefrontData(key, `#graphql
    query FetchCollectionProducts(
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
            ...CollectionFields
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
    ${COLLECTION_FRAGMENT}
    ${IMAGE_FRAGMENT}
    ${PRICE_FRAGMENT}
`, {
    variables: computed(() => collectionInputSchema.parse({
        handle: props.handle,
        ...params.value,
    })),
    transform: data => data?.collection,
    watch: [params],
    cache: 'long',
})

useSeoMeta({
    title: `${collection.value?.title} | Nuxt Shopify Demo Store`,
    description: collection.value?.description,
})

const filters = computed(() => collection.value?.products.filters)
const pageInfo = computed(() => collection.value?.products.pageInfo)
const products = computed(() => flattenConnection(collection.value?.products))

const loadPrevious = async () => {
    route.query.after = null
    route.query.before = pageInfo.value?.startCursor ?? null

    await router.push({ query: {
        ...route.query,
        before: pageInfo.value?.startCursor,
        after: undefined,
        first: undefined,
        last: 12,
    } })
}

const loadNext = async () => {
    await router.push({ query: {
        ...route.query,
        before: undefined,
        after: pageInfo.value?.endCursor,
        first: 12,
        last: undefined,
    } })
}

watch(locale, () => {
    route.query.first = null
    route.query.last = null
})

watch(() => collection.value?.products.pageInfo, async () => await nextTick().then(() =>
    window.scrollTo({ top: 0, behavior: 'smooth' })), { deep: true })
</script>

<template>
    <div class="w-full lg:grid lg:grid-cols-12">
        <FilterBar
            v-if="filters?.length"
            :filters="filters"
            class="lg:col-span-4 xl:col-span-3"
        />

        <div class="my-12 lg:my-14 lg:col-span-8 xl:col-span-9">
            <div
                v-if="pageInfo?.hasPreviousPage"
                class="flex w-full justify-center pb-8 md:mb-8"
            >
                <UButton
                    variant="soft"
                    color="primary"
                    class="cursor-pointer"
                    icon="i-lucide-arrow-up"
                    @click="loadPrevious"
                >
                    {{ $t('pagination.previous') }}
                </UButton>
            </div>

            <div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3">
                <ProductCard
                    v-for="product in products"
                    :key="product.id"
                    :product="product"
                    class="pb-14 border-b border-b-default"
                    carousel
                />
            </div>

            <div
                v-if="pageInfo?.hasNextPage"
                class="flex w-full justify-center mt-14"
            >
                <UButton
                    variant="soft"
                    color="primary"
                    class="cursor-pointer"
                    icon="i-lucide-arrow-down"
                    @click="loadNext"
                >
                    {{ $t('pagination.next') }}
                </UButton>
            </div>

            <div
                v-if="status === 'pending'"
                class="flex justify-center pt-8"
            >
                {{ $t('collection.products.loading') }}
            </div>

            <div
                v-else-if="!products || products.length === 0"
                class="flex flex-col justify-center items-center col-span-full text-center"
            >
                <div class="flex items-center pb-2 gap-2">
                    <UIcon
                        name="i-lucide-triangle-alert"
                        class="text-dimmed size-6"
                    />

                    <p class="text-xl text-dimmed">
                        {{ $t('collection.products.notFound') }}
                    </p>
                </div>

                <UButton
                    variant="subtle"
                    color="primary"
                    class="mt-4"
                    :label="$t('filters.clear')"
                    @click="router.push({ query: {} })"
                />
            </div>
        </div>
    </div>
</template>
