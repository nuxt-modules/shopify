<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const {
    filters: activeFilters,
    count: activeFilterCount,
} = useFilters()

const { country } = useCountry()
const { locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const handle = route.params.handle as string

const endCursor = ref<string | null>()

const { data, error, status, refresh } = await useFetch('/api/collection', {
    method: 'POST',
    body: {
        handle,
        first: 12,
        after: endCursor,
        language: locale,
        country: country,
        filters: activeFilters,
    },
    watch: [
        locale,
        country,
        () => route.query.filters,
    ],
})

if (error.value) throw createError({
    statusCode: 500,
    statusMessage: `Failed to fetch collection with handle ${handle}`,
    fatal: true,
})

endCursor.value = data.value?.collection?.products?.pageInfo?.endCursor

const products = computed(() => data.value?.collection?.products?.edges || [])
const filters = computed(() => data.value?.collection?.products?.filters || [])
const hasNextPage = computed(() => data.value?.collection?.products?.pageInfo?.hasNextPage)

const currentSort = ref('price')

const loadMore = async () => {
    if (!hasNextPage.value) return

    await refresh()
}

const resetFilters = async () => {
    await router.replace({ query: { ...route.query, filters: undefined } })
}
</script>

<template>
    <div>
        <h1 class="text-2xl font-bold">
            {{ data?.collection?.title }}
        </h1>

        <div class="py-4 flex gap-1 lg:gap-8 lg:justify-end">
            <UDrawer
                title="Filters"
                description="Quickly find the perfect vintage piece that suits you"
                :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
                handle-only
            >
                <UButton
                    variant="outline"
                    size="xs"
                    :icon="icons.filter"
                    :label="`${t('filter.label')} ${activeFilterCount > 0 ? `(${activeFilterCount})` : ''}`"
                    class="lg:hidden"
                />

                <template #body>
                    <Filters
                        class="pt-4 pb-10 w-full"
                        :filters="filters"
                    />
                </template>
            </UDrawer>

            <UButton
                v-if="activeFilterCount > 0"
                variant="link"
                color="neutral"
                size="xs"
                :icon="icons.close"
                :label="t('filter.clear')"
                class="lg:hidden"
                @click="resetFilters"
            />

            <div class="flex flex-row gap-3 ml-auto md:gap-4">
                <UButton
                    variant="outline"
                    size="xs"
                    :icon="icons.sortAsc"
                    :label="`${t('sort.by')} ${currentSort}: ${t('sort.ascending')}`"
                    :ui="{
                        label: 'hidden sm:block',
                    }"
                />

                <UPopover
                    :content="{
                        align: 'end',
                        side: 'bottom',
                        sideOffset: 12,
                    }"
                    :ui="{
                        content: 'max-w-[320px] w-full',
                    }"
                >
                    <UButton
                        variant="outline"
                        size="xs"
                        :icon="icons.sort"
                        :label="t('sort.label')"
                    />

                    <template #content>
                        <UNavigationMenu
                            highlight
                            highlight-color="primary"
                            orientation="vertical"
                            :items="[
                                {
                                    label: t('sort.price'),
                                    active: currentSort === 'price',
                                    onSelect: () => {
                                        currentSort = 'price'
                                    },
                                },
                                {
                                    label: t('sort.relevance'),
                                    active: currentSort === 'relevance',
                                    onSelect: () => {
                                        currentSort = 'relevance'
                                    },
                                },
                                {
                                    label: t('sort.releaseDate'),
                                    active: currentSort === 'releaseDate',
                                    onSelect: () => {
                                        currentSort = 'releaseDate'
                                    },
                                },
                            ]"
                        />
                    </template>
                </UPopover>
            </div>
        </div>

        <USeparator class="mb-8" />

        <div class="flex flex-row gap-16 grow mb-16">
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
                        :label="t('filter.clear')"
                        class="pt-1.5 cursor-pointer"
                        @click="resetFilters"
                    />
                </div>

                <p class="pb-6">
                    Quickly find the perfect vintage piece that suits you
                </p>

                <Filters :filters="filters" />
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
