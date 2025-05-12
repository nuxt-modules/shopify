<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const route = useRoute()
const { t } = useI18n()

const handle = route.params.handle as string

const {
    products,
    loading,
    hasNextPage,
    load,
    loadMore,
} = useListing(handle)

const data = await load()

const currentSort = ref('price')

const collection = computed(() => data?.collection)
const filters = computed(() => collection.value?.products?.filters ?? [])
</script>

<template>
    <div>
        <h1 class="text-2xl font-bold">
            {{ collection?.title }}
        </h1>

        <div class="py-4 flex justify-between gap-6 md:gap-8 lg:justify-end">
            <UDrawer
                title="Filters"
                description="Quickly find the perfect vintage piece that suits you"
                :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
            >
                <UButton
                    variant="outline"
                    size="xs"
                    :icon="icons.filter"
                    :label="t('filter.label')"
                    class="lg:hidden"
                />

                <template #body>
                    <Filters
                        class="pt-4 pb-10 w-full"
                        :filters="filters"
                    />
                </template>
            </UDrawer>

            <div class="flex flex-row gap-2 md:gap-4">
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
                                        load()
                                    },
                                },
                                {
                                    label: t('sort.relevance'),
                                    active: currentSort === 'relevance',
                                    onSelect: () => {
                                        currentSort = 'relevance'
                                        load()
                                    },
                                },
                                {
                                    label: t('sort.releaseDate'),
                                    active: currentSort === 'releaseDate',
                                    onSelect: () => {
                                        currentSort = 'releaseDate'
                                        load()
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
                <h2 class="text-xl font-bold pb-2">
                    Filters
                </h2>

                <p class="pb-6">
                    Quickly find the perfect vintage piece that suits you
                </p>

                <Filters :filters="filters" />
            </aside>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-16">
                <ProductListing :products="products" />
            </div>
        </div>

        <div
            v-if="hasNextPage"
            class="flex justify-center"
        >
            <UButton
                variant="soft"
                color="primary"
                :disabled="loading"
                :trailing-icon="loading ? icons.spinner : icons.down"
                :ui="{ trailingIcon: loading ? 'animate-spin': '' }"
                @click="loadMore"
            >
                {{ t('listing.loadMore') }}
            </UButton>
        </div>
    </div>
</template>
