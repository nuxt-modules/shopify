import type { ProductConnectionFieldsFragment, FetchCollectionQuery, ProductFieldsFragment } from '#shopify/storefront'

import { queryToFilters } from '~/shared/filters'

export const useListing = (handle: string) => {
    const { country } = useCountry()
    const { locale } = useI18n()
    const router = useRouter()
    const route = useRoute()

    const loading = ref(false)
    const products = ref<{ cursor: string, node: ProductFieldsFragment }[]>([])
    const filters = ref<ProductConnectionFieldsFragment['filters']>([])
    const hasNextPage = ref(false)
    const endCursor = ref<string | undefined>(undefined)

    const currentPage = computed(() => Number.parseInt(route.query.p as string || '1', 10))
    const key = computed(() => `collection-${handle}-${locale.value}-${country.value}`)
    const routeFilters = computed(() => queryToFilters(route.query))
    const activeFilterCount = computed(() => Object.keys(routeFilters.value).length)

    const onLoad = (data: MaybeRef<FetchCollectionQuery | undefined>) => {
        hasNextPage.value = unref(data)?.collection?.products.pageInfo.hasNextPage ?? false
        endCursor.value = unref(data)?.collection?.products.pageInfo.endCursor ?? undefined
        products.value = [...products.value, ...(unref(data)?.collection?.products.edges ?? [])]
        filters.value = unref(data)?.collection?.products.filters ?? []

        return unref(data)
    }

    const fetchProducts = async (params: { cursor?: string, pages?: number } = {}) => await $fetch('/api/collection', {
        method: 'POST',
        body: {
            handle,
            filters: routeFilters.value,
            country: country.value,
            language: locale.value,
            first: 12 * (params.pages || 1),
            after: params.cursor,
        },
    })

    const load = () => useAsyncData(key, async () => await fetchProducts({
        pages: currentPage.value,
    })).then(({ data, error }) => {
        if (error.value) throw createError({
            statusCode: 500,
            statusMessage: `Error fetching collection with handle: ${handle}`,
            fatal: true,
        })

        return onLoad(data)
    })

    const loadMore = async () => {
        if (!hasNextPage.value) return

        loading.value = true

        await fetchProducts({ cursor: endCursor.value, pages: 1 })
            .then(data => onLoad(data))
            .then(() => router.replace({ query: { ...route.query, p: currentPage.value + 1 } }))

        loading.value = false
    }

    const reset = async () => {
        loading.value = true

        products.value = []
        hasNextPage.value = false
        endCursor.value = undefined

        await fetchProducts({ pages: 1 })
            .then(data => onLoad(data))
            .then(() => router.replace({ query: { ...route.query, p: undefined } }))

        loading.value = false
    }

    watch([country, locale, () => route.query.filters], async () => await reset())

    return {
        products,
        loading,
        hasNextPage,
        filters,
        activeFilterCount,
        load,
        loadMore,
    }
}
