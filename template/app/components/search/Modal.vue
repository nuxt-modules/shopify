<script setup lang="ts">
const localePath = useLocalePath()

const query = ref('')
const open = ref(false)

const { params: localization } = useLocalization()

const { data, status } = await useStorefrontData(localizedKey('search', () => query.value ?? 'none'), `#graphql
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
          image {
            ...ImageFields
          }
        }
      }
    }
    articles(first: $first, query: $query) {
      edges {
        node {
          handle
          title
          excerpt
          blog {
            handle
          }
        }
      }
    }
  }
`, {
  variables: computed(() => predictiveSearchParamsSchema.extend(localizationParamsSchema.shape).parse({
    query: query.value,
    ...localization.value,
  })),
  watch: [query],
  lazy: true,
})

const groups = computed(() => [
  {
    id: 'queries',
    label: $t('search.queries'),
    items: data.value?.predictiveSearch?.queries.map(predictedQuery => ({
      label: predictedQuery.text,
      onSelect: () => query.value = predictedQuery.text,
    })),
  },
  {
    id: 'products',
    label: $t('search.products'),
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
    label: $t('search.collections'),
    items: flattenConnection(data.value?.collections).map(collection => ({
      label: collection.title,
      suffix: collection.description,
      to: localePath(`/collection/${collection.handle}`),
      avatar: {
        src: `${collection.image?.url}?width=40&height=40`,
        alt: collection.image?.altText,
      },
      onSelect: () => open.value = false,
    })),
  },
  {
    id: 'articles',
    label: $t('search.articles'),
    items: flattenConnection(data.value?.articles).map(article => ({
      label: article.title,
      suffix: article.excerpt ?? undefined,
      to: localePath(`/blog/${article.blog.handle}/${article.handle}`),
      onSelect: () => open.value = false,
    })),
  },
])

const updateQuery = debounce((value: string) => query.value = value, 300)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('search.label')"
    :description="$t('search.description')"
    :ui="{
      content: 'max-w-2xl',
    }"
  >
    <UButton
      icon="i-lucide-search"
      variant="ghost"
      color="neutral"
      :label="$t('search.label')"
      :ui="{
        label: 'hidden min-[380px]:block',
      }"
    />

    <template #content>
      <UCommandPalette
        :loading="status === 'pending'"
        :placeholder="$t('search.placeholder')"
        :groups="groups"
        :close="true"
        :ui="{
          label: 'w-full text-lg px-2 pb-1',
          group: 'flex flex-wrap p-2',
          item: 'sm:w-1/2 p-3',
          itemLeadingAvatar: 'size-24 rounded-md me-2',
          itemLabel: 'whitespace-normal flex flex-col',
          itemLabelBase: 'py-1',
          itemLabelSuffix: 'line-clamp-3',
          itemWrapper: '[[data-slot=itemLeadingAvatar]+&]:py-0.5',
        }"
        @update:search-term="updateQuery"
      />

      <ShopifySearchView
        v-if="query"
        :data="{ searchTerm: query }"
      />
    </template>
  </UModal>
</template>
