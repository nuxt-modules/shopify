<script setup lang="ts">
import type { LocationQuery } from 'vue-router'

import type { ProductFormOptionValue } from '~/utils/product-form'

const props = defineProps<{
  product: ProductFormFieldsFragment
  query?: LocationQuery
}>()

const form = useProductForm()
const localePath = useLocalePath()

const optionNames = computed(() => form.options.map(option => option.name))

const choosable = computed(() => form.options.some(option => option.values.length > 1))

const kindOf = (option: typeof form.options[number]): 'color' | 'image' | 'text' => {
  if (option.values.every(value => value.swatch?.color)) return 'color'
  if (option.values.every(value => value.swatch?.image?.previewImage?.url)) return 'image'

  return 'text'
}

const options = computed(() => form.options.map(option => ({ ...option, kind: kindOf(option) })))

const to = (value: ProductFormOptionValue) =>
  productSelectionPath(localePath(`/products/${value.handle}`), value.selectedOptions, optionNames.value, props.query)
</script>

<template>
  <div v-if="choosable">
    <UFormField
      v-for="option in options"
      :key="option.name"
      :label="option.name"
      class="mb-6 lg:mb-8"
    >
      <div class="flex flex-wrap gap-2">
        <ProductOptionValue
          v-for="value in option.values"
          :key="value.name"
          :option-name="option.name"
          :value="value"
          :kind="option.kind"
          :to="to(value)"
          :cross-product="value.handle !== props.product.handle"
          :replace="!!props.query"
        >
          <span
            v-if="option.kind === 'color'"
            class="block w-8 h-8 rounded-full"
            :style="{ background: value.swatch?.color ?? undefined }"
          />

          <NuxtImg
            v-else-if="option.kind === 'image'"
            :src="value.swatch?.image?.previewImage?.url ?? undefined"
            alt=""
            width="50"
            height="50"
          />

          <template v-else>
            {{ value.name }}
          </template>
        </ProductOptionValue>
      </div>
    </UFormField>
  </div>
</template>
