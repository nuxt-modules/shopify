<script setup lang="ts">
import type { FilterFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filters: FilterFieldsFragment[]
}>()

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

const state = reactive({})
</script>

<template>
    <div class="flex flex-col gap-4">
        <UForm
            :state="state"
            :validate-on="['change']"
            class="gap-2 flex flex-col"
        >
            <template
                v-for="({ component, filter }, index) in filterComponents"
                :key="`filter-${index}`"
            >
                <component
                    :is="component"
                    :filter="filter"
                />
            </template>
        </UForm>
    </div>
</template>
