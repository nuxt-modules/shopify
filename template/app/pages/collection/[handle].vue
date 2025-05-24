<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { filters: activeFilters } = useFilters()
const { country } = useCountry()
const { locale } = useI18n()
const route = useRoute()

const handle = route.params.handle as string

const key = computed(() => `collection-${handle}-${locale.value}-${country.value}`)

const startCursor = ref<string>()
const endCursor = ref<string>()

const { data, error } = await useAsyncData(key, () => $fetch('/api/collection', {
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
}), {
    watch: [
        locale,
        country,
        activeFilters,
        startCursor,
        endCursor,
    ],
})

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
</script>

<template>
    <div>
        <h1 class="text-2xl font-bold">
            {{ data?.collection?.title }}
        </h1>

        <div class="py-4 flex gap-1 lg:gap-8 lg:justify-end">
            <FilterDrawer :filters="filters" />

            <Sortings />
        </div>

        <USeparator class="mb-8" />

        <div class="flex flex-row gap-16 grow">
            <aside class="hidden top-20 lg:block w-1/4 min-w-64 sticky mb-auto">
                <Filters
                    :filters="filters"
                    heading
                />
            </aside>

            <ProductListing
                :products="products"
                @load-previous="loadPrevious"
                @load-next="loadNext"
            />
        </div>
    </div>
</template>
