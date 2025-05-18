import { queryToFilters } from '~/shared/filters'

export const useFilters = () => {
    const route = useRoute()

    const filters = computed(() => queryToFilters(route.query))

    const count = computed(() => Object.keys(filters.value ?? {}).length)

    return {
        filters,
        count,
    }
}
