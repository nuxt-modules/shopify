import type { ProductFilter, ProductFilterFieldsFragment } from '#shopify/storefront'
import type { LocationQuery } from 'vue-router'
import type { MaybeRefOrGetter } from 'vue'

type AvailableFilters = ProductFilterFieldsFragment['filters']

export const useFilters = (name?: keyof ProductFilter) => {
  const router = useRouter()
  const route = useRoute()

  const filters = computed(() => queryToFilters(route.query))

  const get = () => queryToFilters(route.query)
    .filter(filter => name ? !!filter[name] : true) ?? []

  const set = debounce((value: ProductFilter[]) => router.push({
    query: {
      ...route.query,
      ...(name ? { [`filter.${name}`]: undefined } : {}),
      before: undefined,
      after: undefined,
      first: undefined,
      last: undefined,
      ...filtersToQuery(value),
    },
  }), 200)

  return { filters, get, set }
}

export const usePruneFilters = (available: MaybeRefOrGetter<AvailableFilters | undefined>) => {
  const { locale } = useI18n()
  const router = useRouter()
  const route = useRoute()

  const stale = ref(false)

  const isSupported = (filter: ProductFilter, filters: AvailableFilters) => filters.some(f => f.type === 'PRICE_RANGE'
    ? filter.price !== undefined
    : f.values.some(value => value.input === JSON.stringify(filter)))

  const groupByName = (filters: ProductFilter[]) => filters.reduce((groups, filter) => {
    const name = Object.keys(filter).at(0) as keyof ProductFilter

    return { ...groups, [name]: [...(groups[name] ?? []), filter] }
  }, {} as Partial<Record<keyof ProductFilter, ProductFilter[]>>)

  watch(locale, () => stale.value = true)

  watch(() => toValue(available), (filters) => {
    if (!stale.value || !filters) return

    stale.value = false

    const applied = queryToFilters(route.query)
    const supported = applied.filter(filter => isSupported(filter, filters))

    if (supported.length === applied.length) return

    const query = Object.fromEntries(Object.entries(route.query)
      .filter(([key]) => !key.startsWith('filter.')))

    const pruned = Object.values(groupByName(supported))
      .reduce((query, group) => ({ ...query, ...filtersToQuery(group) }), {} as LocationQuery)

    router.replace({
      query: {
        ...query,
        before: undefined,
        after: undefined,
        first: undefined,
        last: undefined,
        ...pruned,
      },
    })
  })
}
