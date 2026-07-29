<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const { add } = useCart()

const props = defineProps<{
  product: ProductFieldsFragment
}>()

const soldOut = computed(() => isSoldOut(props.product))

const addToCart = async () => {
  if (soldOut.value) return

  const variant = props.product.selectedOrFirstAvailableVariant
    ?? flattenConnection(props.product.variants).find(variant => variant.availableForSale)

  if (variant) {
    await add(variant.id, 1)
  }
}
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    :disabled="soldOut"
    :trailing-icon="soldOut ? 'i-lucide-ban' : 'i-lucide-shopping-bag'"
    :label="soldOut ? $t('product.soldOut') : $t('product.add')"
    :aria-label="soldOut ? $t('product.soldOut') : $t('product.choose')"
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
    @click="addToCart"
  />
</template>
