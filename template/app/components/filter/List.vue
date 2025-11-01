<script setup lang="ts">
import type { ProductFilterFieldsFragment, ProductFilter } from '#shopify/storefront'

const props = defineProps<{
    filter: ProductFilterFieldsFragment['filters'][number]
}>()

const key = computed(() => Object.keys(JSON.parse(props.filter.values.at(0)?.input ?? '{}')).at(0) as keyof ProductFilter)
const items = computed(() => props.filter.values.map(v => v.label))

const { get, set } = useFilter(key.value)

const value = ref(get().map(f => props.filter.values.find(v => v.input === JSON.stringify(f))?.label).filter(v => v !== undefined))

const submit = async (value: (string | number | bigint | Record<string, unknown> | null)[]) => {
    await set(props.filter.values.filter(v => value.includes(v.label)).map(v => JSON.parse(v.input) as ProductFilter))
}
</script>

<template>
    <UCheckboxGroup
        v-model="value"
        :items="items"
        @update:model-value="(value) => submit(value)"
    />
</template>
