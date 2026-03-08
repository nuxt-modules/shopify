<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const localePath = useLocalePath()
const { params } = useCollection()
const { locale } = useI18n()
const router = useRouter()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const key = computed(() => `collection-${locale.value}-${handle.value}-products`)

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
            title,
            description,
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
    variables: computed(() => collectionInputSchema.parse({
        handle: handle.value,
        ...params.value,
    })),
    transform: data => data?.collection,
    watch: [params],
})

useSeoMeta({
    title: `${collection.value?.title} | Nuxt Shopify Demo Store`,
    description: collection.value?.description,
})

const filters = computed(() => collection.value?.products.filters)
const pageInfo = computed(() => collection.value?.products.pageInfo)
const products = computed(() => flattenConnection(collection.value?.products))

const toTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    })
}

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

    toTop()
}

const loadNext = async () => {
    await router.push({ query: {
        ...route.query,
        before: undefined,
        after: pageInfo.value?.endCursor,
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
    <UContainer class="py-6 lg:py-8">
        <UBreadcrumb
            :items="[
                { label: 'Collections' },
                { label: collection?.title, to: localePath(`/collection/${handle}`) },
            ]"
            class="mb-6 lg:mb-8"
        />

        <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
            {{ collection?.title }}
        </h1>

        <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
            {{ collection?.description }}
        </p>

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
                    Loading...
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
                            No products found
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </UContainer>
</template>
