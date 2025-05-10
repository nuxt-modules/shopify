<script setup lang="ts">
import type { FilterState } from '~/components/Filters.vue'

definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { country } = useCountry()
const { locale } = useI18n()
const route = useRoute()
const { t } = useI18n()

const handle = route.params.handle as string

const fetchProducts = async (language: string, country: string, cursor?: string) => await $fetch('/api/collection', {
    method: 'POST',
    body: {
        handle,
        country,
        language,
        first: 12,
        after: cursor,
    },
})

const { data, error } = await useAsyncData(`collection-${handle}-${locale.value}`, async () =>
    await fetchProducts(locale.value, country.value))

if (error.value) {
    throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch collection with handle: ${handle}`,
        fatal: true,
    })
}

const collection = computed(() => data.value?.collection)

const hasNextPage = ref(collection.value?.products.pageInfo.hasNextPage ?? false)
const endCursor = ref(collection.value?.products.pageInfo.endCursor ?? undefined)
const products = ref(collection.value?.products.edges ?? [])
const currentSort = ref('price')

const loadMore = async () => {
    if (!hasNextPage.value) return

    const data = await fetchProducts(locale.value, country.value, endCursor.value)

    products.value.push(...data?.collection?.products.edges ?? [])
    hasNextPage.value = data?.collection?.products.pageInfo.hasNextPage ?? false
    endCursor.value = data?.collection?.products.pageInfo.endCursor ?? undefined
}

const onChange = (state: FilterState) => {
    console.log(state)
}

watch([country, locale], async () => {
    products.value = []
    endCursor.value = undefined

    await loadMore()
})
</script>

<template>
    <div class="flex flex-col gap-8">
        <div class="flex flex-col gap-4 md:gap-8">
            <div class="flex flex-col grow gap-5 md:flex-row md:gap-16">
                <h1 class="text-2xl font-bold">
                    {{ collection?.title }}
                </h1>

                <div class="flex grow justify-between md:justify-end gap-4">
                    <UButton
                        variant="outline"
                        size="xs"
                        :icon="icons.filter"
                        :label="t('filter.label')"
                        class="lg:hidden"
                    />

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

                        <UButton
                            variant="outline"
                            size="xs"
                            :icon="icons.sort"
                            :label="t('sort.label')"
                        />
                    </div>
                </div>
            </div>

            <USeparator />
        </div>

        <div class="flex flex-row gap-16 grow mb-16">
            <aside class="hidden lg:flex w-1/4 min-w-64 sticky">
                <Filters
                    class="sticky top-20 mb-auto"
                    @change="onChange"
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
                :icon="icons.down"
                color="primary"
                @click="loadMore"
            >
                Load more
            </UButton>
        </div>
    </div>
</template>
