import { queryToFilters } from '~/shared/filters'

export const useFilters = () => {
    const route = useRoute()

    const filters = computed(() => queryToFilters(route.query))

    return {
        filters,
    }
}
