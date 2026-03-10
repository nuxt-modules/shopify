import type { ProductFilter } from '#shopify/storefront'
import type { LocationQuery } from 'vue-router'

export const queryToFilters = (query: LocationQuery) => {
    const filters = Object.entries(query).filter(([key]) => key.startsWith('filter.'))

    return filters.reduce((filters, [key, value]) => {
        const filterKey = key.split('.').at(-1) ?? key

        if (Array.isArray(value)) {
            value.forEach(v => filters.push({
                [filterKey]: v === 'true' || v === 'false' ? JSON.parse(v) : v,
            }))
        }
        else {
            filters.push({
                [filterKey]: JSON.parse(String(value)),
            })
        }

        return filters
    }, [] as ProductFilter[])
}

export const filtersToQuery = (filters: ProductFilter[]) => {
    let query: Record<string, string | string[]> = {}

    filters.forEach((filter) => {
        const name = Object.keys(filter).at(0) as keyof ProductFilter

        if (filters.length === 0) {
            const { [`filter.${name}`]: _, ...restQuery } = query
            query = restQuery
        }
        else if (filters.length === 1) {
            query[`filter.${name}`] = JSON.stringify(filters[0]?.[name])
        }
        else {
            query[`filter.${name}`] = filters.map(f => String(f[name]))
        }
    })

    return query
}
