<script setup lang="ts">
import type { LocationQuery } from 'vue-router'

import type { ProductFormData } from '~/utils/product-form'

import { canAddToCart } from '@shopify/hydrogen'

const props = defineProps<{
  product: ProductFormFieldsFragment
  query?: LocationQuery
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()

const open = useCartDrawer()
const form = useProductForm()

const quantity = ref(1)

const addable = computed(() => canAddToCart(props.product as ProductFormData, form.options))
const soldOut = computed(() => form.selectedVariant?.availableForSale === false)
const lowStock = computed(() => isLowStock(form.selectedVariant ?? undefined))
const subscription = computed(() => hasSellingPlans(props.product))

const errors = computed(() => [
  ...form.errors.userErrors,
  ...form.errors.warnings,
  ...form.errors.networkErrors,
])

const maxQuantity = computed(() => {
  const quantity = form.selectedVariant?.quantityAvailable

  return quantity && quantity > 0 ? Math.min(quantity, 10) : 10
})

const label = computed(() => {
  if (addable.value) return $t('product.add')
  if (!form.selectedVariant) return $t('product.selectOptions')

  return soldOut.value ? $t('product.soldOut') : $t('product.unavailable')
})

const openCart = () => {
  open.value = true

  emit('submit')
}
</script>

<template>
  <div>
    <div class="flex-col lg:flex pb-6 lg:pb-8">
      <h1 class="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
        {{ props.product.title }}
      </h1>

      <ProductPrice
        :price="form.selectedVariant?.price ?? props.product.priceRange.minVariantPrice"
        :compare-at-price="form.selectedVariant?.compareAtPrice"
        class="inline-block lg:text-lg lg:mb-0"
        discount
      />

      <div class="flex flex-wrap items-center gap-2 mt-4">
        <UBadge
          v-if="soldOut"
          color="neutral"
          variant="subtle"
          :label="$t('product.soldOut')"
        />

        <UBadge
          v-else-if="lowStock"
          color="warning"
          variant="subtle"
          :label="$t('product.lowStock', { count: form.selectedVariant?.quantityAvailable ?? 0 })"
        />

        <UBadge
          v-if="subscription"
          color="primary"
          variant="subtle"
          :label="$t('product.subscription')"
        />

        <UBadge
          v-if="props.product.isGiftCard"
          color="primary"
          variant="subtle"
          :label="$t('product.giftCard')"
        />
      </div>
    </div>

    <USeparator class="mb-6 lg:mb-8" />

    <ProductOptionGroup
      :product="props.product"
      :query="props.query"
      class="mb-6 lg:mb-8"
    />

    <form v-bind="form.formProps({ beforeSubmit: openCart })">
      <input
        type="hidden"
        v-bind="form.register('merchandiseId', {})"
      >

      <input
        type="hidden"
        v-bind="form.register('quantity', { value: quantity })"
      >

      <div class="flex justify-between items-center">
        <UFormField
          :label="$t('product.quantity')"
          class="-mt-1"
          :ui="{ label: 'hidden' }"
        >
          <UInputNumber
            v-model="quantity"
            :min="1"
            :max="maxQuantity"
            class="w-24 lg:w-28"
            size="xl"
          />
        </UFormField>

        <UButton
          v-bind="form.register('addToCart', {})"
          size="xl"
          variant="subtle"
          :loading="form.pending.value || (!form.selectedVariant && props.loading)"
          :disabled="!addable"
          :trailing-icon="addable ? 'i-lucide-shopping-bag' : 'i-lucide-ban'"
          :ui="{ trailingIcon: 'size-5' }"
          :label="label"
        />
      </div>

      <p
        v-for="error in errors"
        :key="error.message"
        role="alert"
        class="mt-4 text-sm text-error"
      >
        {{ error.message }}
      </p>
    </form>
  </div>
</template>
