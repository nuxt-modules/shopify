import type { ProductFilter } from '#shopify/storefront'
import type { LocationQuery } from 'vue-router'

export const filtersToQuery = (filters: ProductFilter): LocationQuery => {
    const query: LocationQuery = {}

    if (Object.keys(filters).length > 0) {
        query.filters = JSON.stringify(filters)
    }

    return query
}

export const queryToFilters = (query: LocationQuery): ProductFilter | undefined => {
    if (query.filters && typeof query.filters === 'string') {
        return JSON.parse(query.filters) as ProductFilter
    }
}
