<script setup lang="ts">
import type { ProductFilter } from '@shopify/hydrogen'

import { formatMoney, getSortByValue, isFilterInputActive, serializeCollectionParams } from '@shopify/hydrogen'
import { useCollection, useCollectionForm } from '@shopify/hydrogen/vue'

const props = defineProps<{
  filters: FilterFieldsFragment[]
  currencyCode?: string
}>()

const route = useRoute()

const state = useCollection()
const { formProps } = useCollectionForm()

const sortOptions = [
  { label: 'Featured', value: getSortByValue('COLLECTION_DEFAULT', false) },
  { label: 'Best selling', value: getSortByValue('BEST_SELLING', false) },
  { label: 'Price, low to high', value: getSortByValue('PRICE', false) },
  { label: 'Price, high to low', value: getSortByValue('PRICE', true) },
]

const sort = computed(() => getSortByValue(state.value.sortKey ?? 'COLLECTION_DEFAULT', state.value.reverse))
const price = computed(() => state.value.filters.find(filter => filter.price)?.price)

const symbol = computed(() => props.currencyCode
  ? formatMoney({ amount: '0', currencyCode: props.currencyCode }, { locale: 'en-US' }).currencyNarrowSymbol
  : undefined)

const toParam = (input: string) => {
  const [entry] = serializeCollectionParams({ filters: [JSON.parse(input) as ProductFilter], sortKey: undefined, reverse: false })

  return entry && { name: entry[0], value: entry[1] }
}

const groups = computed(() => props.filters.map(filter => ({
  ...filter,
  values: filter.values.map(value => ({
    ...value,
    param: toParam(value.input),
    active: isFilterInputActive(state.value.filters, value.input),
  })),
})))

const submit = (event: Event) => (event.target as HTMLInputElement).form?.requestSubmit()
</script>

<template>
  <form
    v-bind="formProps()"
    method="get"
    :action="route.path"
    class="space-y-6"
  >
    <select
      name="sort_by"
      aria-label="Sort by"
      class="w-full rounded-md border border-default bg-default px-2.5 py-1.5 text-sm"
      @change="submit"
    >
      <option
        v-for="option in sortOptions"
        :key="option.value"
        :value="option.value"
        :selected="option.value === sort"
      >
        {{ option.label }}
      </option>
    </select>

    <fieldset
      v-for="filter in groups"
      :key="filter.id"
    >
      <legend class="mb-2 text-sm font-semibold text-muted">
        {{ filter.label }}
      </legend>

      <div
        v-if="filter.type === 'PRICE_RANGE'"
        class="flex items-center gap-2"
      >
        <label class="flex items-center gap-1 rounded-md border border-default px-2.5 py-1.5 text-sm">
          <span aria-hidden="true">{{ symbol }}</span>

          <input
            type="number"
            name="filter.v.price.gte"
            min="0"
            step="any"
            placeholder="From"
            :value="price?.min"
            :aria-label="`Minimum price in ${currencyCode}`"
            class="w-full bg-transparent outline-none"
            @change="submit"
          >
        </label>

        <label class="flex items-center gap-1 rounded-md border border-default px-2.5 py-1.5 text-sm">
          <span aria-hidden="true">{{ symbol }}</span>

          <input
            type="number"
            name="filter.v.price.lte"
            min="0"
            step="any"
            placeholder="To"
            :value="price?.max"
            :aria-label="`Maximum price in ${currencyCode}`"
            class="w-full bg-transparent outline-none"
            @change="submit"
          >
        </label>
      </div>

      <div
        v-else
        class="space-y-1"
      >
        <label
          v-for="value in filter.values"
          :key="value.id"
          class="flex items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            :name="value.param?.name"
            :value="value.param?.value"
            :checked="value.active"
            class="accent-primary"
            @change="submit"
          >

          {{ value.label }} ({{ value.count }})
        </label>
      </div>
    </fieldset>

    <noscript>
      <button type="submit">Apply filters</button>
    </noscript>
  </form>
</template>
