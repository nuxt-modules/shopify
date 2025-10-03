<script setup lang="ts">
const { language, country } = useLocalization()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const query = ref('')
const open = ref(false)

const { data, status } = await useStorefrontData(`search-${query.value ?? 'none'}-${locale.value}`, `#graphql
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
    variables: computed(() => predictiveSearchParamsSchema.extend(localizationParamsSchema.shape).parse({
        query: query.value,
        language: language.value,
        country: country.value,
    })),
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
        :title="t('search.label')"
        :description="t('search.description')"
    >
        <UButton
            icon="i-lucide-search"
            variant="ghost"
            color="neutral"
            :label="t('search.label')"
        />

        <template #content>
            <UCommandPalette
                :loading="status === 'pending'"
                :placeholder="t('search.placeholder')"
                :groups="groups"
                :close="true"
                @update:search-term="updateQuery"
            />
        </template>
    </UModal>
</template>
