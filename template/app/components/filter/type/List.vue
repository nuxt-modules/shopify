<script setup lang="ts">
import type { Filter, ProductFilter } from '#shopify/storefront'

const props = defineProps<{
    filter: Filter
}>()

const key = computed(() => Object.keys(JSON.parse(props.filter.values.at(0)?.input ?? '{}')).at(0) as keyof ProductFilter)
const items = computed(() => props.filter.values.map(v => v.label))

const { get, set } = useFilters(key.value)

const componentToFilter = (value: string[]) =>
    props.filter.values.filter(v => value.includes(v.label)).map(v => JSON.parse(v.input) as ProductFilter)

const filterToComponent = (filter: ProductFilter[]) =>
    filter.map(f => props.filter.values.find(v => v.input === JSON.stringify(f))?.label).filter(v => v !== undefined) as string[]

const value = ref(filterToComponent(get()))

const submit = async (value: string[]) => set(componentToFilter(value))
</script>

<template>
    <UCheckboxGroup
        v-model="value"
        :items="items"
        @update:model-value="(value) => submit(value)"
    />
</template>
