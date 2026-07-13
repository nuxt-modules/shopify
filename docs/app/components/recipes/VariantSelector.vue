<script setup lang="ts">
import type { ProductOptionFieldsFragment } from '#shopify/storefront'

defineProps<{
  options: ProductOptionFieldsFragment[]
}>()

const selected = defineModel<Record<string, string>>({ required: true })
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="option in options"
      :key="option.id"
    >
      <p class="mb-2 text-sm font-semibold text-muted">
        {{ option.name }}
      </p>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="value in option.optionValues"
          :key="value.id"
          :variant="selected[option.name] === value.name ? 'solid' : 'outline'"
          color="neutral"
          size="sm"
          @click="() => { selected = { ...selected, [option.name]: value.name } }"
        >
          {{ value.name }}
        </UButton>
      </div>
    </div>
  </div>
</template>
