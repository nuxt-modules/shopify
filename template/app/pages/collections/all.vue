<script setup lang="ts">
import { getSortByValue, parseCollectionParams } from '@shopify/hydrogen'

const { shopify: { shopName, collection: { perPage } } } = useAppConfig()
const { params: localization } = useLocalization()
const localePath = useLocalePath()
const storefront = useStorefront()
const search = useRouteSearch()
const { t } = useI18n()

const { data, error, status } = await useAsyncData(localizedKey('collection', 'all'), async () => {
  const dataSearch = search.value
  const params = new URLSearchParams(dataSearch)
  const { sortKey, reverse } = parseCollectionParams(params)
  const before = params.get('before')
  const sortable = sortKey === 'PRICE' || sortKey === 'TITLE'

  const { data } = await storefront.request(`#graphql
    query FetchAllProducts(
      $first: Int,
      $last: Int,
      $after: String,
      $before: String,
      $sortKey: ProductSortKeys,
      $reverse: Boolean,
      $language: LanguageCode,
      $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
      products(
        first: $first,
        last: $last,
        after: $after,
        before: $before,
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        ...ProductConnectionFields
      }
    }
  `, {
    variables: {
      ...(before ? { last: perPage, before } : { first: perPage, after: params.get('after') ?? undefined }),
      sortKey: sortable ? sortKey : 'BEST_SELLING',
      reverse: sortable && reverse,
      ...localization.value,
    },
    cache: 'long',
  })

  return {
    dataSearch,
    products: data?.products,
  }
}, {
  watch: [search],
})

if (error.value) {
  const graphQLErrors = (error.value.cause as { graphQLErrors?: { extensions?: { code?: string } }[] } | undefined)?.graphQLErrors
  const rejected = !!graphQLErrors?.length && graphQLErrors.every(({ extensions }) => !extensions?.code)

  throw createError({
    status: rejected ? 400 : error.value.status,
    statusText: rejected ? undefined : error.value.statusText,
    message: error.value.message,
    fatal: true,
  })
}

const products = computed(() => flattenConnection(data.value?.products))

const defaultSort = getSortByValue('BEST_SELLING', false)

const sortOptions = computed(() => [
  { label: t('sort.bestSelling'), value: defaultSort },
  { label: t('sort.titleAscending'), value: getSortByValue('TITLE', false) },
  { label: t('sort.titleDescending'), value: getSortByValue('TITLE', true) },
  { label: t('sort.priceAscending'), value: getSortByValue('PRICE', false) },
  { label: t('sort.priceDescending'), value: getSortByValue('PRICE', true) },
])

useSeoMeta({
  title: `${t('collection.allProducts.title')} | ${shopName}`,
  description: t('collection.allProducts.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('breadcrumb.collections'), to: localePath('/collections') },
        { label: $t('collection.allProducts.title') },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ $t('collection.allProducts.title') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ $t('collection.allProducts.description') }}
    </p>

    <CollectionBrowser
      v-if="data"
      handle="all"
      :data-search="data.dataSearch"
      :filters="[]"
      :sort-options="sortOptions"
      :default-sort="defaultSort"
    >
      <CollectionProducts
        :products="products"
        :page-info="data.products?.pageInfo"
        :pending="status === 'pending'"
      />
    </CollectionBrowser>
  </UContainer>
</template>
