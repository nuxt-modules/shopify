<script setup lang="ts">
import type { ProductFilter } from '@shopify/hydrogen'

import { formatMoney, getFilterRemovalUrl, getSearchResultUrl, getSortByValue, isFilterInputActive } from '@shopify/hydrogen'
import { useCollection } from '@shopify/hydrogen/vue'

const props = defineProps<{
  form: string
  filters: FilterFieldsFragment[]
  currencyCode?: string
  sortOptions: Array<{ label: string, value: string }>
  defaultSort: string
  term?: string
  summary?: string
}>()

const route = useRoute()
const search = useRouteSearch()
const { locale, t } = useI18n()

const state = useCollection()

const sort = computed(() => state.value.sortKey ? getSortByValue(state.value.sortKey, state.value.reverse) : props.defaultSort)

const clearPath = computed(() => props.term ? getSearchResultUrl({ baseUrl: route.path, term: props.term }) : route.path)

const money = (amount: number) => props.currencyCode
  ? formatMoney({ amount: String(amount), currencyCode: props.currencyCode }, { locale: locale.value }).toString()
  : String(amount)

const label = (filter: ProductFilter) => {
  if (filter.price) {
    const { min, max } = filter.price

    if (min !== undefined && min !== null && max !== undefined && max !== null) return t('filters.price.range', { min: money(min), max: money(max) })
    if (min !== undefined && min !== null) return t('filters.price.from', { min: money(min) })
    if (max !== undefined && max !== null) return t('filters.price.upTo', { max: money(max) })
  }

  const value = props.filters.flatMap(group => group.values).find(value => isFilterInputActive([filter], value.input))

  return value?.label ?? t('filters.active')
}

const chips = computed(() => state.value.filters.map((filter) => {
  const removal = getFilterRemovalUrl(new URLSearchParams(search.value), filter)

  return {
    key: JSON.stringify(filter),
    label: label(filter),
    to: removal === '?' ? route.path : `${route.path}${removal}`,
  }
}))

const submit = (event: Event) => (event.target as HTMLSelectElement).form?.requestSubmit()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <p
        role="status"
        class="text-muted"
      >
        {{ summary }}
      </p>

      <div class="flex items-center gap-2">
        <label
          :for="`${form}-sort`"
          class="text-sm text-muted"
        >
          {{ $t('sort.label') }}
        </label>

        <select
          :id="`${form}-sort`"
          :form="form"
          name="sort_by"
          class="rounded-md bg-default px-2.5 py-1.5 text-sm text-highlighted ring ring-inset ring-accented focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

        <UButton
          type="submit"
          :form="form"
          variant="soft"
          class="hidden noscript:flex"
          :label="$t('filters.apply')"
        />
      </div>
    </div>

    <div
      v-if="chips.length"
      class="flex flex-wrap items-center gap-2"
    >
      <UButton
        v-for="chip in chips"
        :key="chip.key"
        :to="chip.to"
        :label="chip.label"
        :aria-label="$t('filters.remove', { filter: chip.label })"
        color="neutral"
        variant="subtle"
        size="sm"
        trailing-icon="i-lucide-x"
        class="rounded-full"
      />

      <UButton
        :to="clearPath"
        :label="$t('filters.clear')"
        variant="link"
        size="sm"
      />
    </div>
  </div>
</template>
