<script setup lang="ts">
import type { ProductFormData } from '~/utils/product-form'

import { canAddToCart } from '@shopify/hydrogen'

const props = defineProps<{
  product: ProductFieldsFragment & Pick<ProductFormData, 'selectedOrFirstAvailableVariant' | 'adjacentVariants'>
}>()

const open = useCartDrawer()
const form = useProductForm()

const soldOut = computed(() => isSoldOut(props.product))

const addable = computed(() => canAddToCart(props.product, form.options))

const label = computed(() => {
  if (addable.value) return $t('product.add')

  return soldOut.value ? $t('product.soldOut') : $t('product.unavailable')
})
</script>

<template>
  <form v-bind="form.formProps({ beforeSubmit: () => { open = true } })">
    <input
      type="hidden"
      v-bind="form.register('merchandiseId', {})"
    >

    <UButton
      v-bind="form.register('addToCart', {})"
      color="neutral"
      variant="ghost"
      :disabled="!addable"
      :trailing-icon="addable ? 'i-lucide-shopping-bag' : 'i-lucide-ban'"
      :label="label"
      :aria-label="label"
      :ui="{
        trailingIcon: 'size-5',
        label: [
          'ms-auto',
          'max-w-0',
          'invisible',
          'group-focus:visible',
          'group-focus:max-w-full',
          'group-hover:visible',
          'group-hover:max-w-full',
          'transition-all',
          'duration-300',
          'truncate-0',
          'ps-1.5',
          'pe-1',
        ],
        base: 'absolute bottom-0 group rounded-full p-2.5',
      }"
    />
  </form>
</template>
