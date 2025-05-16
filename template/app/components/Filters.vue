<script setup lang="ts">
import type { ProductFilter, ProductConnectionFieldsFragment } from '#shopify/storefront'

import { queryToFilters, filtersToQuery } from '~/shared/filters'

const props = defineProps<{
    filters: ProductConnectionFieldsFragment['filters']
}>()

const { count } = useFilters()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const filterComponents = computed(() => props.filters.map(filter => ({
    component: (() => {
        switch (filter.id) {
            case 'filter.v.price':
                return resolveComponent('FiltersPrice')
            case 'filter.v.availability':
                return resolveComponent('FiltersAvailability')
            default:
                return `No template found for filter type ${filter.id}`
        }
    })(),

    filter,
})))

const onUpdate = (type: keyof ProductFilter, value: ProductFilter) => {
    const filters = queryToFilters(route.query)

    router.replace({ query: {
        ...route.query,
        ...filtersToQuery({
            ...filters,
            ...value,
        }),
    } })
}

const reset = async () => {
    await router.replace({ query: {
        ...route.query,
        filters: undefined,
        p: undefined,
    } })
}
</script>

<template>
    <div>
        <div class="flex items-center justify-between pb-2">
            <h2 class="text-xl font-bold">
                Filters
            </h2>

            <UButton
                v-if="count > 0"
                variant="link"
                color="neutral"
                size="xs"
                :icon="icons.close"
                :label="t('filter.clear')"
                class="pt-1.5 cursor-pointer"
                @click="reset"
            />
        </div>

        <p class="pb-6">
            Quickly find the perfect vintage piece that suits you
        </p>

        <div class="flex flex-col gap-6">
            <component
                :is="component"
                v-for="({ component, filter }, index) in filterComponents"
                :key="`filter-${index}`"
                :filter="filter"
                @update:filter="onUpdate"
            />
        </div>
    </div>
</template>
