<script setup lang="ts">
import type { Filter, ProductFilter } from '#shopify/storefront'

const props = defineProps<{
  filter: Filter
}>()

const key = computed(() => Object.keys(JSON.parse(props.filter.values.at(0)?.input ?? '{}')).at(0) as keyof ProductFilter)

const { get, set } = useFilters(key.value)

const componentToFilter = (value: string[]) =>
  props.filter.values.filter(v => value.includes(v.label)).map(v => JSON.parse(v.input) as ProductFilter)

const filterToComponent = (filter: ProductFilter[]) =>
  filter.map(f => props.filter.values.find(v => v.input === JSON.stringify(f))?.label).filter(v => v !== undefined) as string[]

const value = ref(filterToComponent(get()))

const toggle = (label: string, checked: boolean) => {
  value.value = checked
    ? [...value.value, label]
    : value.value.filter(v => v !== label)

  set(componentToFilter(value.value))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <USwitch
      v-for="item in props.filter.values"
      :key="item.id"
      :model-value="value.includes(item.label)"
      :label="item.label"
      @update:model-value="(checked) => toggle(item.label, Boolean(checked))"
    />
  </div>
</template>
