<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { filters: activeFilters, count: activeFilterCount } = useFilters()
const { t, locale } = useI18n()
const { country } = useCountry()
const router = useRouter()
const route = useRoute()

const handle = route.params.handle as string

const key = computed(() => [
    'collection',
    handle,
    locale.value,
    country.value,
    startCursor.value,
    endCursor.value,
    route.query.filters,
].join('-'))

const startCursor = ref<string>()
const endCursor = ref<string>()

const { data, error, status } = await useAsyncData(key, () => $fetch('/api/collection', {
    method: 'POST',
    body: {
        handle,
        first: startCursor.value ? undefined : 12,
        last: startCursor.value ? 12 : undefined,
        before: startCursor.value,
        after: endCursor.value,
        language: locale.value,
        country: country.value,
        filters: activeFilters.value,
    },
}))

if (error.value) throw createError({
    statusCode: 500,
    statusMessage: `Failed to fetch collection with handle ${handle}`,
    fatal: true,
})

const products = computed(() => data.value?.collection?.products)
const filters = computed(() => products.value?.filters ?? [])

const toTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    })
}

const loadPrevious = () => {
    endCursor.value = undefined
    startCursor.value = products.value?.pageInfo.startCursor ?? undefined

    toTop()
}

const loadNext = () => {
    startCursor.value = undefined
    endCursor.value = products.value?.pageInfo.endCursor ?? undefined

    toTop()
}

const onFilterUpdate = () => {
    startCursor.value = undefined
    endCursor.value = undefined

    toTop()
}

const resetFilters = async () => {
    console.log('Resetting filters')

    router.replace({ query: {
        ...route.query,
        filters: undefined,
    } })

    startCursor.value = undefined
    endCursor.value = undefined

    toTop()
}

watch([locale, country], () => {
    startCursor.value = undefined
    endCursor.value = undefined

    toTop()
})
</script>

<template>
    <div>
        <h1 class="text-2xl font-bold">
            {{ data?.collection?.title }}
        </h1>

        <div class="py-4 flex gap-1 lg:gap-8 lg:justify-end">
            <UDrawer
                :title="t('filters.label')"
                description="Quickly find the perfect vintage piece that suits you"
                :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
                handle-only
            >
                <UButton
                    variant="outline"
                    size="xs"
                    :icon="icons.filter"
                    :label="`${t('filters.label')} ${activeFilterCount > 0 ? `(${activeFilterCount})` : ''}`"
                    class="lg:hidden"
                />

                <template #body>
                    <Filters
                        class="pt-4 pb-10 w-full"
                        :filters="filters"
                        @update="onFilterUpdate"
                    />
                </template>
            </UDrawer>

            <UButton
                v-if="activeFilterCount > 0"
                variant="link"
                color="neutral"
                size="xs"
                :icon="icons.close"
                :label="t('filters.clear')"
                class="lg:hidden"
                @click="resetFilters"
            />

            <Sortings />
        </div>

        <USeparator class="mb-8" />

        <div class="flex flex-row gap-16 grow">
            <aside class="hidden top-20 lg:block w-1/4 min-w-64 sticky mb-auto">
                <div class="flex items-center justify-between pb-2">
                    <h2 class="text-xl font-bold">
                        Filters
                    </h2>

                    <UButton
                        v-if="activeFilterCount > 0"
                        variant="link"
                        color="neutral"
                        size="xs"
                        :icon="icons.close"
                        :label="t('filters.clear')"
                        class="pt-1.5 cursor-pointer"
                        @click="resetFilters"
                    />
                </div>

                <p class="pb-6">
                    Quickly find the perfect vintage piece that suits you
                </p>

                <Filters
                    :filters="filters"
                    @update="onFilterUpdate"
                />
            </aside>

            <ProductListing
                :key="key"
                :products="products"
                :status="status"
                @reset-filters="resetFilters"
                @load-previous="loadPrevious"
                @load-next="loadNext"
            />
        </div>
    </div>
</template>
