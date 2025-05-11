import type { FetchCollectionQuery, ProductFieldsFragment } from '#shopify/storefront'
import type { Serialized } from '#shopify/utils'

export const useListing = (handle: string) => {
    const { country } = useCountry()
    const { locale } = useI18n()
    const router = useRouter()
    const route = useRoute()

    const loading = ref(false)
    const products = ref<{ cursor: string, node: ProductFieldsFragment }[]>([])
    const hasNextPage = ref(false)
    const endCursor = ref<string | undefined>(undefined)

    const onLoad = (response: Serialized<FetchCollectionQuery>) => {
        hasNextPage.value = response?.collection?.products.pageInfo.hasNextPage ?? false
        endCursor.value = response?.collection?.products.pageInfo.endCursor ?? undefined
        products.value = [...products.value, ...(response?.collection?.products.edges ?? [])]
    }

    const fetchProducts = async (params: { cursor?: string, pages?: number } = {}) => {
        loading.value = true

        const currentPage = Number.parseInt(route.query.p as string || '1', 10)

        const response = await $fetch('/api/collection', {
            method: 'POST',
            body: {
                handle,
                country: country.value,
                language: locale.value,
                first: 12 * (params.pages || currentPage),
                after: params.cursor,
            },
        })

        loading.value = false

        return response
    }

    const load = () => useAsyncData(`collection-${handle}-${locale.value}`, async () => await fetchProducts())
        .then(({ data, error }) => {
            if (error.value) throw createError({
                statusCode: 500,
                statusMessage: `Error fetching collection with handle: ${handle}`,
                fatal: true,
            })

            if (data.value) onLoad(data.value)
        })

    const loadMore = async () => {
        if (!hasNextPage.value) return

        const data = await fetchProducts({ cursor: endCursor.value, pages: 1 })

        if (!data) return

        onLoad(data)

        const currentPage = Number.parseInt(route.query.p as string || '1', 10)
        await router.replace({ query: { ...route.query, p: currentPage + 1 } })
    }

    return {
        products,
        loading,
        hasNextPage,
        load,
        loadMore,
    }
}
