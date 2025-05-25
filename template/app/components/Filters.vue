<script setup lang="ts">
import type { ProductFilter, ProductConnectionFieldsFragment } from '#shopify/storefront'

import { queryToFilters, filtersToQuery } from '~/shared/filters'

const props = defineProps<{
    filters: ProductConnectionFieldsFragment['filters']
}>()

const emits = defineEmits<{
    reset: []
}>()

const router = useRouter()
const route = useRoute()

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

const onUpdate = async <T extends keyof ProductFilter>(type: T, value: ProductFilter[T]) => {
    emits('reset')

    const filters = queryToFilters(route.query)

    await router.replace({
        query: filtersToQuery({
            ...filters,
            [type]: value,
        }),
    })
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <component
            :is="component"
            v-for="({ component, filter }, index) in filterComponents"
            :key="`filter-${index}`"
            :filter="filter"
            @update:filter="onUpdate"
        />
    </div>
</template>
