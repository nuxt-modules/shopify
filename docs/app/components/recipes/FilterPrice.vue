<script setup lang="ts">
import type { FilterFieldsFragment, ProductFilter } from '#shopify/storefront'

const props = defineProps<{
  facet: FilterFieldsFragment
}>()

const applied = defineModel<ProductFilter[]>({ required: true })

const bounds = computed(() => JSON.parse(props.facet.values[0]?.input ?? '{}').price ?? {})

const from = ref('')
const to = ref('')

const apply = () => {
  const min = from.value === '' ? undefined : Number(from.value)
  const max = to.value === '' ? undefined : Number(to.value)
  const others = applied.value.filter(filter => !filter.price)

  applied.value = min === undefined && max === undefined
    ? others
    : [...others, { price: { min, max } }]
}

watch(applied, (filters) => {
  const price = filters.find(filter => filter.price)?.price

  from.value = price?.min?.toString() ?? ''
  to.value = price?.max?.toString() ?? ''
}, { immediate: true })
</script>

<template>
  <div>
    <p class="mb-2 text-sm font-semibold text-muted">
      {{ facet.label }}
    </p>

    <div class="flex items-center gap-2">
      <UInput
        v-model="from"
        type="number"
        :placeholder="`${bounds.min ?? 0}`"
        class="w-full"
        @keyup.enter="apply"
      />

      <span class="text-muted">-</span>

      <UInput
        v-model="to"
        type="number"
        :placeholder="`${bounds.max ?? ''}`"
        class="w-full"
        @keyup.enter="apply"
      />

      <UButton
        icon="i-lucide-arrow-right"
        color="neutral"
        aria-label="Apply price range"
        @click="apply"
      />
    </div>
  </div>
</template>
