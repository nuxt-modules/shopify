<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

import { formatMoney } from '@shopify/hydrogen'

const props = defineProps<{
  product: ProductFieldsFragment
}>()

const price = computed(() => formatMoney(props.product.priceRange.minVariantPrice, { locale: 'en-US' }).toString())

const image = computed(() => props.product.featuredImage)
const src = computed(() => image.value?.url ?? '')
const to = computed(() => `https://demostore.mock.shop/products/${props.product.handle}`)
</script>

<template>
  <UPageCard
    :key="props.product.id"
    :to="to"
    :title="props.product.title"
    :description="props.product.description"
    orientation="vertical"
    reverse
    :ui="{
      description: 'line-clamp-2',
    }"
  >
    <template #header>
      <NuxtImg
        :src="src ?? undefined"
        :alt="image?.altText ?? undefined"
        :width="image?.width ?? undefined"
        :height="image?.height ?? undefined"
        sizes="xs:100vw sm:50vw md:33vw lg:33vw xl:33vw"
        class="rounded-sm"
      />
    </template>

    <template #footer>
      <p class="font-semibold">
        from {{ price }}
      </p>
    </template>
  </UPageCard>
</template>
