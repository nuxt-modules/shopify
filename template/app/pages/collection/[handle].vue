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
</script>

<template>
    <div>
        <h1 class="text-2xl font-bold">
            {{ data?.collection?.title }}
        </h1>

        <div class="py-4 flex justify-between gap-6 md:gap-8 lg:justify-end">
            <UDrawer
                :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
            >
                <UButton
                    variant="outline"
                    size="xs"
                    :icon="icons.filter"
                    :label="t('filter.label')"
                    class="lg:hidden"
                />

                <template #content>
                    <Filters
                        class="p-4 pb-10 w-full shadow"
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
                        <USelect
                            v-model="currentSort"
                            :items="[
                                { label: t('sort.price'), value: 'price' },
                                { label: t('sort.releaseDate'), value: 'releaseDate' },
                                { label: t('sort.relevance'), value: 'relevance' },
                            ]"
                            class="min-w-42"
                        />
                    </template>
                </UPopover>
            </div>
        </div>

        <USeparator class="mb-8" />

        <div class="flex flex-row gap-16 grow mb-16">
            <aside class="hidden top-6 lg:flex w-1/4 min-w-64 sticky">
                <Filters
                    class="sticky top-20 mb-auto"
                />
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
