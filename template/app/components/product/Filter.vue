<script setup lang="ts">
import type { FilterFieldsFragment, FilterValue } from '#shopify/storefront'

type PriceRangeInput = {
    price: {
        min: number
        max: number
    }
}

type ListInput = {
    [key: string]: unknown
}

const props = defineProps<{
    filter: FilterFieldsFragment
}>()

const value = defineModel<FilterValue>()

const type = computed(() => props.filter.type)

const priceRange = computed(() => props.filter.type === 'PRICE_RANGE'
    ? (JSON.parse(props.filter.values?.[0]?.input as string) as PriceRangeInput)
    : undefined)

const list = computed(() => props.filter.type === 'LIST'
    ? (JSON.parse(props.filter.values?.[0]?.input as string) as ListInput)
    : undefined)

console.log(props.filter)
</script>

<template>
    <div>
        <template v-if="type === 'PRICE_RANGE'">
            Price
        </template>

        <template v-if="type === 'LIST'">
            List
        </template>

        <template v-if="type === 'BOOLEAN'">
            Boolean
        </template>
    </div>
</template>
