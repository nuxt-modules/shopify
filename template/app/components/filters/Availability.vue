<script setup lang="ts">
import type { ProductFilter, FilterFieldsFragment } from '#shopify/storefront'
import type { UpdateFilterFn } from '../../../types/filter'

type FilterType = Pick<ProductFilter, 'available'>

const props = defineProps<{
    filter: FilterFieldsFragment
}>()

const emits = defineEmits<UpdateFilterFn>()

const available = computed(() => props.filter.values?.map(value => JSON.parse(value.input as string) as FilterType))

const value = ref(available.value.map(item => ({
    active: item.available as boolean,
    value: item.available as boolean,
})))
</script>

<template>
    <UFormField
        :label="props.filter.label"
        name="available"
    >
        <UCheckbox
            v-for="(item, index) in value"
            :key="`availability-${index}`"
            v-model="item.active"
            :label="item.value ? 'In Stock' : 'Out of Stock'"
        />
    </UFormField>
</template>
