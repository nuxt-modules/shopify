import type { ProductFilter } from '#shopify/storefront'

export const useFilters = () => {
    const route = useRoute()

    const filters = computed(() => Object.entries(route.query).filter(([key]) => key.startsWith('filter.')).reduce(
        (filters, [key, value]) => {
            if (key.startsWith('filter.')) {
                const filterKey = key.split('.').at(-1) ?? key

                if (Array.isArray(value)) value.forEach(v => filters.push({ [filterKey]: JSON.parse(String(v)) }))
                else filters.push({ [filterKey]: JSON.parse(String(value)) })
            }
            return filters
        },
        [] as ProductFilter[]))

    return { filters }
}

export const useFilter = (name: keyof ProductFilter) => {
    const router = useRouter()
    const route = useRoute()

    const get = (): ProductFilter[] => {
        const queryValue = route.query[`filter.${name}`]

        if (!queryValue) return []

        if (Array.isArray(queryValue)) {
            return queryValue
                .filter(value => value !== null)
                .map(value => ({ [name]: JSON.parse(value as string) }))
        }
        else {
            const parsed = JSON.parse(queryValue)
            return [{ [name]: parsed }]
        }
    }

    const set = (value: ProductFilter[]) => {
        let query = { ...route.query }

        delete query.before
        delete query.after
        delete query.first
        delete query.last

        if (value.length === 0) {
            const { [`filter.${name}`]: _, ...restQuery } = query
            query = restQuery
        }
        else if (value.length === 1) {
            query[`filter.${name}`] = JSON.stringify(value[0]?.[name])
        }
        else {
            query[`filter.${name}`] = value.map(filter => String(filter[name]))
        }

        return router.push({ query })
    }

    return { get, set }
}
