<script setup lang="ts">
import type { ValidProductSelectionResult } from '@shopify/hydrogen'

import { getSelectedProductOptions } from '@shopify/hydrogen'

import { CartProvider } from '~/utils/cart'
import { ProductProvider } from '~/utils/product'

const props = defineProps<{
  handle: string
}>()

const route = useRoute()
const router = useRouter()

const selectedOptions = computed(() => getSelectedProductOptions({ searchParams: toSearchParams(route.query) }))

const { data: product, refresh } = await useStorefrontData(`product-${props.handle}`, `#graphql
  query GetProductDetails($handle: String!, $selectedOptions: [SelectedOptionInput!]) {
    product(handle: $handle) {
      ...ProductFormFields
    }
  }
`, {
  variables: computed(() => ({
    handle: props.handle,
    selectedOptions: selectedOptions.value,
  })),
  transform: data => data.product,
  watch: [selectedOptions],
})

const select = (result: ValidProductSelectionResult) => router.replace(selectionPath(
  route.path,
  result.selectedOptions,
  product.value?.options.map(option => option.name) ?? [],
  toSearchParams(route.query),
))

onMounted(() => {
  if (Object.keys(route.query).length) refresh()
})
</script>

<template>
  <div>
    <CartProvider :initial-data="{ cart: null }">
      <ProductProvider
        v-if="product"
        :product="product"
        :on-select="select"
      >
        <ProductForm :product="product" />
      </ProductProvider>
    </CartProvider>
  </div>
</template>
