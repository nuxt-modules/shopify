import type { LocationQuery } from 'vue-router'

export const filtersToQuery = (filters: ProductFilter): LocationQuery => {
    const query: LocationQuery = {}

    if (Object.keys(filters).length > 0) {
        const filtersString = JSON.stringify(filters)

        if (filtersString.length > 2) {
            query.filters = filtersString
        }
    }

    return query
}

export const queryToFilters = (query: LocationQuery): ProductFilter | undefined => {
    if (query.filters && typeof query.filters === 'string') {
        return JSON.parse(query.filters) as ProductFilter
    }
}
