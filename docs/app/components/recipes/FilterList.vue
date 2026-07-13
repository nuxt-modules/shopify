<script setup lang="ts">
import type { FilterFieldsFragment, ProductFilter } from '#shopify/storefront'

const props = defineProps<{
  facet: FilterFieldsFragment
}>()

const applied = defineModel<ProductFilter[]>({ required: true })

const keyOf = (filter: ProductFilter) => JSON.stringify(filter)

const isActive = (input: string) => applied.value.some(filter => keyOf(filter) === keyOf(JSON.parse(input)))

const toggle = (input: string) => {
  const filter = JSON.parse(input) as ProductFilter

  applied.value = isActive(input)
    ? applied.value.filter(active => keyOf(active) !== keyOf(filter))
    : [...applied.value, filter]
}
</script>

<template>
  <div>
    <p class="mb-2 text-sm font-semibold text-muted">
      {{ props.facet.label }}
    </p>

    <div class="space-y-1">
      <UCheckbox
        v-for="value in props.facet.values"
        :key="value.id"
        :model-value="isActive(value.input)"
        :label="`${value.label} (${value.count})`"
        @update:model-value="toggle(value.input)"
      />
    </div>
  </div>
</template>
