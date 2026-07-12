<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

const props = defineProps<{
  handle: string
}>()

const applied = ref<ProductFilter[]>([])

const { data: collection } = await useStorefrontData(`filters-${props.handle}`, `#graphql
  query GetCollectionFilters($handle: String!, $first: Int, $filters: [ProductFilter!]) {
    collection(handle: $handle) {
      title

      products(first: $first, filters: $filters) {
        filters {
          ...FilterFields
        }
        nodes {
          ...ProductFields
        }
      }
    }
  }
  ${FILTER_FRAGMENT}
  ${PRODUCT_FRAGMENT}
`, {
  variables: computed(() => ({
    handle: props.handle,
    first: 12,
    filters: applied.value,
  })),
  transform: data => data.collection,
  watch: [applied],
})

const facets = computed(() => collection.value?.products.filters ?? [])
const products = computed(() => collection.value?.products.nodes ?? [])
</script>

<template>
  <div class="grid gap-8 md:grid-cols-4">
    <aside class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="font-bold">
          Filters
        </p>

        <UButton
          v-if="applied.length"
          variant="link"
          size="xs"
          @click="applied = []"
        >
          Clear
        </UButton>
      </div>

      <template
        v-for="facet in facets"
        :key="facet.id"
      >
        <FilterPrice
          v-if="facet.type === 'PRICE_RANGE'"
          v-model="applied"
          :facet="facet"
        />

        <FilterList
          v-else
          v-model="applied"
          :facet="facet"
        />
      </template>
    </aside>

    <div class="md:col-span-3">
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
