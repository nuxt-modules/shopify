<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

import { parseCollectionParams } from '@shopify/hydrogen'
import { CollectionProvider } from '@shopify/hydrogen/vue'

import CollectionFilters from '~/components/collection/Filters.vue'

const props = defineProps<{
  handle: string
}>()

const route = useRoute()
const storefront = useStorefront()

const search = computed(() => toSearchParams(route.query).toString())

const { data, status, refresh } = await useAsyncData(`filters-${props.handle}`, async () => {
  const dataSearch = search.value
  const { filters, sortKey, reverse } = parseCollectionParams(new URLSearchParams(dataSearch))

  const { data } = await storefront.request(`#graphql
    query GetCollectionFilters(
      $handle: String!,
      $first: Int,
      $filters: [ProductFilter!],
      $sortKey: ProductCollectionSortKeys,
      $reverse: Boolean
    ) {
      localization {
        country {
          currency {
            isoCode
          }
        }
      }
      collection(handle: $handle) {
        title
        products(first: $first, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
          filters {
            ...FilterFields
          }
          nodes {
            ...ProductFields
          }
        }
      }
    }
  `, {
    variables: {
      handle: props.handle,
      first: 12,
      filters: filters as ProductFilter[],
      sortKey,
      reverse,
    },
  })

  return {
    dataSearch,
    currencyCode: data?.localization.country.currency.isoCode,
    collection: data?.collection,
  }
}, {
  watch: [search],
})

const navigate = (next: string) => navigateTo(`${route.path}${next}`, { replace: search.value.length > 0 })

onMounted(() => {
  if (search.value) refresh()
})
</script>

<template>
  <div>
    <CollectionProvider
      v-if="data?.collection"
      :data="{ handle, dataSearch: data.dataSearch }"
      :url-search="search"
      @change="navigate"
    >
      <div class="grid gap-8 md:grid-cols-4">
        <CollectionFilters
          :filters="data.collection.products.filters"
          :currency-code="data.currencyCode"
        />

        <div
          class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:col-span-3 transition-opacity"
          :class="{ 'opacity-50': status === 'pending' }"
        >
          <ProductCard
            v-for="product in data.collection.products.nodes"
            :key="product.id"
            :product="product"
          />
        </div>
      </div>
    </CollectionProvider>
  </div>
</template>
