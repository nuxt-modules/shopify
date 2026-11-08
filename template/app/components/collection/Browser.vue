<script setup lang="ts">
import { CollectionProvider } from '@shopify/hydrogen/vue'

defineProps<{
  handle: string
  dataSearch: string
  filters: FilterFieldsFragment[]
  currencyCode?: string
  sortOptions: Array<{ label: string, value: string }>
  defaultSort: string
  term?: string
  summary?: string
}>()

const route = useRoute()
const search = useRouteSearch()

const form = useId()

const navigate = (next: string) => navigateTo(`${route.path}${next}`, { replace: search.value.length > 0 })
</script>

<template>
  <CollectionProvider
    :data="{ handle, dataSearch }"
    :url-search="search"
    @change="navigate"
  >
    <div class="lg:grid lg:grid-cols-12 lg:gap-12">
      <CollectionFilters
        :id="form"
        :filters="filters"
        :currency-code="currencyCode"
        :term="term"
        :class="filters.length ? 'mb-8 lg:mb-0 lg:col-span-4 xl:col-span-3' : 'hidden'"
      />

      <div :class="filters.length ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'">
        <CollectionToolbar
          :form="form"
          :filters="filters"
          :currency-code="currencyCode"
          :sort-options="sortOptions"
          :default-sort="defaultSort"
          :term="term"
          :summary="summary"
          class="mb-8"
        />

        <slot />
      </div>
    </div>
  </CollectionProvider>
</template>
