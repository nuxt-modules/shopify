<script setup lang="ts">
import type { ProductFilter, FilterFieldsFragment } from '#shopify/storefront'
import type { UpdateFilterFn } from '../../../types/filter'

const props = defineProps<{
    filter: FilterFieldsFragment
}>()

const emits = defineEmits<UpdateFilterFn>()

const available = computed(() => props.filter.values?.map(value => JSON.parse(value.input ?? '') as Pick<ProductFilter, 'available'>))

const value = ref(available.value.map(item => ({
    active: item.available ?? false,
    value: item,
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
            @change="emits('update:filter', 'available', item.value as Pick<ProductFilter, 'available'>)"
        />
    </UFormField>
</template>
