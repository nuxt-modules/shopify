<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { language, country } = useMarket()
const localePath = useLocalePath()
const storefront = useStorefront()
const { t } = useI18n()

const query = ref('')

const { data, status } = await useAsyncData(`search-${query.value}`, async () => await storefront.request(`#graphql
    query predictiveSearch($query: String!, $first: Int, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
        predictiveSearch(query: $query) {
            queries {
                text
            }
        }
        products(first: $first, query: $query) {
            edges {
                node {
                    handle
                    title
                    description
                    featuredImage {
                        ...ImageFields
                    }
                }
            }
        }
        collections(first: $first, query: $query) {
            edges {
                node {
                    handle
                    title
                    description
                }
            }
        }
    }
    ${IMAGE_FRAGMENT}
`, {
    variables: predictiveSearchParamsSchema.extend(localizationParamsSchema.shape).parse({
        query: query.value,
        language: language.value,
        country: country.value,
    }),
}), {
    transform: data => data.data,
    watch: [query],
    lazy: true,
})

const groups = computed(() => [
    {
        id: 'queries',
        label: t('search.queries'),
        items: data.value?.predictiveSearch?.queries.map(predictedQuery => ({
            label: predictedQuery.text,
            onSelect: () => query.value = predictedQuery.text,
        })),
    },
    {
        id: 'products',
        label: t('search.products'),
        items: flattenConnection(data.value?.products).map(product => ({
            label: product.title,
            suffix: product.description,
            to: localePath(`/product/${product.handle}`),
            avatar: {
                src: `${product.featuredImage?.url}?width=40&height=40`,
                alt: product.featuredImage?.altText,
            },
            onSelect: () => open.value = false,
        })),
    },
    {
        id: 'collections',
        label: t('search.collections'),
        items: flattenConnection(data.value?.collections).map(collection => ({
            label: collection.title,
            suffix: collection.description,
            to: localePath(`/collection/${collection.handle}`),
            onSelect: () => open.value = false,
        })),
    },
])

const updateQuery = useDebounceFn((value: string) => query.value = value, 300)
</script>

<template>
    <UModal
        v-model:open="open"
        :title="$t('search.label')"
        :description="$t('search.description')"
    >
        <template #content>
            <UCommandPalette
                v-model:open="open"
                :loading="status === 'pending'"
                :placeholder="$t('search.placeholder')"
                :groups="groups"
                :close="true"
                @update:search-term="updateQuery"
            />
        </template>
    </UModal>
</template>
