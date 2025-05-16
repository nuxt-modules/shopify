<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { filters: activeFilters } = useFilters()
const { country } = useCountry()
const { locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const handle = route.params.handle as string

const getKey = () => `collection-${handle}-${locale.value}-${country.value}-${route.query.p}-${activeFilters.value}`

const { data, error, status } = await useAsyncData(getKey(), async () => $fetch('/api/collection', {
    method: 'POST',
    body: {
        handle,
        first: 12 * (Number(route.query.p) || 1),
        language: locale.value,
        country: country.value,
        filters: activeFilters.value,
    },
}), {
    watch: [
        locale,
        country,
        activeFilters,
        () => route.query.p,
    ],
})

if (error.value) throw createError({
    statusCode: 500,
    statusMessage: `Failed to fetch collection with handle ${handle}`,
    fatal: true,
})

const products = computed(() => data.value?.collection?.products?.edges || [])
const filters = computed(() => data.value?.collection?.products?.filters || [])
const hasNextPage = computed(() => data.value?.collection?.products?.pageInfo?.hasNextPage ?? false)

const loadMore = async () => {
    if (!hasNextPage.value) return

    await router.replace({
        query: {
            ...route.query,
            p: Number(route.query.p || 1) + 1,
        },
    })
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

        <div class="flex flex-row gap-16 grow mb-16">
            <aside class="hidden top-20 lg:block w-1/4 min-w-64 sticky mb-auto">
                <Filters
                    :filters="filters"
                    heading
                />
            </aside>

            <ProductListing :products="products" />
        </div>

        <div
            v-if="hasNextPage"
            class="flex justify-center"
        >
            <UButton
                variant="soft"
                color="primary"
                :disabled="status === 'pending'"
                :trailing-icon="status === 'pending' ? icons.spinner : icons.down"
                :ui="{ trailingIcon: status === 'pending' ? 'animate-spin': '' }"
                class="cursor-pointer"
                @click="loadMore"
            >
                {{ t('listing.loadMore') }}
            </UButton>
        </div>
    </div>
</template>
