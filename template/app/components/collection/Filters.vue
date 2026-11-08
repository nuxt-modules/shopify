<script setup lang="ts">
import type { ProductFilter } from '@shopify/hydrogen'

import { formatMoney, isFilterInputActive, serializeCollectionParams } from '@shopify/hydrogen'
import { useCollection, useCollectionForm } from '@shopify/hydrogen/vue'

const props = defineProps<{
  id: string
  filters: FilterFieldsFragment[]
  currencyCode?: string
  term?: string
}>()

const PRICE_SUBMIT_DELAY = 350

const route = useRoute()
const { locale } = useI18n()

const state = useCollection()
const { formProps } = useCollectionForm()

const loading = computed(() => state.value.status === 'loading')

const toParam = (input: string) => {
  try {
    const [entry] = serializeCollectionParams({ filters: [JSON.parse(input) as ProductFilter], sortKey: undefined, reverse: false })

    return entry && { name: entry[0], value: entry[1] }
  }
  catch {
    return undefined
  }
}

const groups = computed(() => props.filters.map(filter => ({
  ...filter,
  values: filter.values
    .map(value => ({ ...value, param: toParam(value.input), active: isFilterInputActive(state.value.filters, value.input) }))
    .filter(value => value.param && (value.count > 0 || value.active)),
})).filter(filter => filter.type === 'PRICE_RANGE' || filter.values.length > 0))

const isExclusive = (filter: FilterFieldsFragment, name?: string) => filter.type === 'BOOLEAN' || name === 'filter.v.availability'

const toggle = (event: Event, exclusive: boolean) => {
  const input = event.target as HTMLInputElement

  if (exclusive && input.checked) {
    for (const element of input.form?.elements ?? []) {
      if (element instanceof HTMLInputElement && element !== input && element.name === input.name) element.checked = false
    }
  }

  input.form?.requestSubmit()
}

const symbol = computed(() => props.currencyCode
  ? formatMoney({ amount: '0', currencyCode: props.currencyCode }, { locale: locale.value }).currencyNarrowSymbol
  : undefined)

const activePrice = computed(() => state.value.filters.find(filter => filter.price)?.price)

const price = reactive<{ min?: number | string, max?: number | string }>({
  min: activePrice.value?.min ?? undefined,
  max: activePrice.value?.max ?? undefined,
})

const expanded = new Set(groups.value
  .filter(filter => filter.values.some(value => value.active) || (filter.type === 'PRICE_RANGE' && activePrice.value))
  .map(filter => filter.id))

let timer: ReturnType<typeof setTimeout> | undefined

const cancel = () => clearTimeout(timer)

const schedule = (event: Event) => {
  const form = (event.target as HTMLInputElement).form

  cancel()

  timer = setTimeout(() => form?.isConnected && form.requestSubmit(), PRICE_SUBMIT_DELAY)
}

const matches = (draft: number | string | undefined, value?: number | null) =>
  value === undefined || value === null ? draft === undefined || draft === '' : draft !== '' && Number(draft) === value

watch(() => [activePrice.value?.min, activePrice.value?.max] as const, ([min, max]) => {
  if (matches(price.min, min) && matches(price.max, max)) return

  cancel()

  price.min = min ?? undefined
  price.max = max ?? undefined
}, { flush: 'sync' })

onBeforeUnmount(cancel)
</script>

<template>
  <form
    :id="id"
    v-bind="formProps({ beforeSubmit: cancel })"
    method="get"
    :action="route.path"
    :aria-label="$t('filters.title')"
  >
    <input
      v-if="term"
      type="hidden"
      name="q"
      :value="term"
    >

    <p class="text-xl font-bold mb-2">
      {{ $t('filters.title') }}
    </p>

    <details
      v-for="filter in groups"
      :key="filter.id"
      class="group border-b border-default py-3"
      :open="expanded.has(filter.id)"
    >
      <summary class="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
        {{ filter.label }}

        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>

      <fieldset
        class="pt-3 transition-opacity"
        :class="{ 'opacity-60': loading }"
        :aria-busy="loading"
      >
        <legend class="sr-only">
          {{ filter.label }}
        </legend>

        <div
          v-if="filter.type === 'PRICE_RANGE'"
          class="flex items-center gap-2"
        >
          <UInput
            v-model="price.min"
            type="number"
            name="filter.v.price.gte"
            min="0"
            step="any"
            :placeholder="$t('price.from')"
            :aria-label="$t('filters.price.minimum', { currency: currencyCode })"
            @input="schedule"
          >
            <template
              v-if="symbol"
              #leading
            >
              <span aria-hidden="true">{{ symbol }}</span>
            </template>
          </UInput>

          <span class="text-muted">–</span>

          <UInput
            v-model="price.max"
            type="number"
            name="filter.v.price.lte"
            min="0"
            step="any"
            :placeholder="$t('price.to')"
            :aria-label="$t('filters.price.maximum', { currency: currencyCode })"
            @input="schedule"
          >
            <template
              v-if="symbol"
              #leading
            >
              <span aria-hidden="true">{{ symbol }}</span>
            </template>
          </UInput>
        </div>

        <div
          v-else
          class="flex flex-col gap-2"
        >
          <label
            v-for="value in filter.values"
            :key="value.id"
            class="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              :name="value.param?.name"
              :value="value.param?.value"
              :checked="value.active"
              class="size-4 shrink-0 accent-primary"
              @change="toggle($event, isExclusive(filter, value.param?.name))"
            >

            <span
              v-if="value.swatch?.color"
              class="size-4 shrink-0 rounded-full ring ring-inset ring-accented"
              :style="{ backgroundColor: value.swatch.color }"
              aria-hidden="true"
            />

            <span :class="{ 'font-medium': value.active }">{{ value.label }}</span>

            <span class="ms-auto text-xs text-muted">{{ value.count }}</span>
          </label>
        </div>
      </fieldset>
    </details>

    <UButton
      type="submit"
      class="hidden noscript:flex mt-6 w-full justify-center"
      :label="$t('filters.apply')"
    />
  </form>
</template>
