<script setup lang="ts">
import type { ProductFormData } from '~/utils/product'

import { canAddToCart, formatMoney } from '@shopify/hydrogen'

const props = defineProps<{
  product: ProductFormFieldsFragment
}>()

const form = useProductForm()
const toast = useToast()

const quantity = ref(1)

const image = computed(() => form.selectedVariant?.image ?? props.product.featuredImage)
const price = computed(() => formatMoney(form.selectedVariant?.price ?? props.product.priceRange.minVariantPrice, { locale: 'en-US' }).toString())
const addable = computed(() => canAddToCart(props.product as ProductFormData, form.options))

const label = computed(() => {
  if (addable.value) return 'Add to cart'
  if (!form.selectedVariant) return 'Select options'

  return form.selectedVariant.availableForSale ? 'Unavailable' : 'Sold out'
})

const errors = computed(() => [...form.errors.userErrors, ...form.errors.warnings, ...form.errors.networkErrors])

const preview = (event: SubmitEvent) => {
  event.preventDefault()

  toast.add({
    title: 'The docs have no cart',
    description: 'In your app, this adds the selected variant to the cart.',
  })
}
</script>

<template>
  <div class="grid gap-8 md:grid-cols-2">
    <NuxtImg
      v-if="image"
      :src="image.url"
      :alt="image.altText ?? undefined"
      :width="image.width ?? undefined"
      :height="image.height ?? undefined"
      sizes="xs:100vw sm:50vw md:33vw"
      class="rounded-md"
    />

    <div class="space-y-6">
      <div>
        <p class="text-2xl font-bold">
          {{ product.title }}
        </p>

        <p class="text-xl">
          {{ price }}
        </p>
      </div>

      <p class="text-muted">
        {{ product.description }}
      </p>

      <ProductOptions :product="product" />

      <form
        v-bind="form.formProps({ beforeSubmit: preview })"
        class="flex items-end gap-4"
      >
        <input
          type="hidden"
          v-bind="form.register('merchandiseId', {})"
        >

        <input
          type="hidden"
          v-bind="form.register('quantity', { value: quantity })"
        >

        <UInputNumber
          v-model="quantity"
          :min="1"
          class="w-32"
        />

        <UButton
          v-bind="form.register('addToCart', {})"
          size="lg"
          :loading="form.pending.value"
          :disabled="!addable"
        >
          {{ label }}
        </UButton>
      </form>

      <p
        v-for="error in errors"
        :key="error.message"
        role="alert"
        class="text-sm text-error"
      >
        {{ error.message }}
      </p>
    </div>
  </div>
</template>
