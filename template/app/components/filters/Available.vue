<script setup lang="ts">
import type { ProductFilter, FilterFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filter: FilterFieldsFragment
}>()

const available = computed(() => props.filter.values?.map(value => JSON.parse(value.input as string) as Pick<ProductFilter, 'available'>))

const value = ref()
</script>

<template>
    <UFormField
        :label="props.filter.label"
        name="available"
    >
        <UCheckbox
            v-for="(item, index) in available"
            :key="index"
            v-model="value"
        />
    </UFormField>
</template>
