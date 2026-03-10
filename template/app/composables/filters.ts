import type { ProductFilter } from '#shopify/storefront'

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
