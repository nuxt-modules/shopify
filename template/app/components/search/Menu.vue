<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const localePath = useLocalePath()
const storefront = useStorefront()
const { country } = useCountry()
const { t, locale } = useI18n()

const query = ref('')

const { data, status } = await useAsyncData(`search-${query.value}`, async () => await storefront.request(`#graphql
    query predictiveSearch($query: String, $first: Int, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
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
    variables: predictiveSearchParamsSchema.parse({
        query: query.value,
        country: country.value,
        language: locale.value,
    }),
}), {
    transform: data => data.data,
    watch: [query, country, locale],
    lazy: true,
})

const products = computed(() => data.value?.products.edges ?? [])
const collections = computed(() => data.value?.collections.edges ?? [])

const groups = computed(() => [
    {
        id: 'products',
        label: t('search.products'),
        items: products.value.map(product => ({
            label: product.node.title,
            suffix: product.node.description,
            to: localePath(`/product/${product.node.handle}`),
            avatar: {
                src: `${product.node.featuredImage?.url}?width=40&height=40`,
                alt: product.node.featuredImage?.altText,
            },
            onSelect: () => open.value = false,
        })),
    },
    {
        id: 'collections',
        label: t('search.collections'),
        items: collections.value.map(collection => ({
            label: collection.node.title,
            suffix: collection.node.description,
            to: localePath(`/collection/${collection.node.handle}`),
            onSelect: () => open.value = false,
        })),
    },
])

const updateQuery = useDebounceFn((value: string) => query.value = value, 300)

defineShortcuts({
    meta_k: () => open.value = true,
})
</script>

<template>
    <UModal
        v-model:open="open"
        :title="t('search.label')"
        :description="t('search.description')"
    >
        <template #content>
            <UCommandPalette
                v-model:open="open"
                :loading="status === 'pending'"
                :placeholder="t('search.placeholder')"
                :groups="groups"
                :close="true"
                @update:search-term="updateQuery"
            />
        </template>
    </UModal>
</template>
