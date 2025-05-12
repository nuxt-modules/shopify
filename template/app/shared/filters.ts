import type { ProductFilter } from '#shopify/storefront'
import type { LocationQuery } from 'vue-router'

export const filtersToQuery = (filters: ProductFilter[]): LocationQuery => {
    const query: LocationQuery = {}

    filters.forEach((filter) => {
        if (filter.price) {
            if (filter.price.min != null) {
                query['price_min'] = filter.price.min.toString()
            }

            if (filter.price.max != null) {
                query['price_max'] = filter.price.max.toString()
            }
        }

        if (filter.tag) {
            query['tag'] = filter.tag
        }

        if (filter.productType) {
            query['product_type'] = filter.productType
        }
    })

    return query
}

export const queryToFilters = (query: LocationQuery): ProductFilter[] => {
    const filters: ProductFilter[] = []

    if (query['price_min'] || query['price_max']) {
        filters.push({
            price: {
                min: query['price_min'] ? Number.parseFloat(query['price_min'] as string) : undefined,
                max: query['price_max'] ? Number.parseFloat(query['price_max'] as string) : undefined,
            },
        })
    }

    if (query['tag']) {
        filters.push({
            tag: query['tag'] as string,
        })
    }

    if (query['product_type']) {
        filters.push({
            productType: query['product_type'] as string,
        })
    }

    return filters
}
