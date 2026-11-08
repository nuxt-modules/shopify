<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

import { getSortByValue, parseCollectionParams } from '@shopify/hydrogen'

definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName, collection: { perPage } } } = useAppConfig()
const { params: localization } = useLocalization()
const localePath = useLocalePath()
const storefront = useStorefront()
const search = useRouteSearch()
const route = useRoute()
const { t } = useI18n()

const handle = computed(() => route.params.handle as string)

const { data, error, status } = await useAsyncData(localizedKey('collection', handle), async () => {
  const dataSearch = search.value
  const params = new URLSearchParams(dataSearch)
  const { filters, sortKey, reverse } = parseCollectionParams(params)
  const before = params.get('before')

  const { data } = await storefront.request(`#graphql
    query FetchCollection(
      $handle: String!,
      $first: Int,
      $last: Int,
      $after: String,
      $before: String,
      $sortKey: ProductCollectionSortKeys,
      $reverse: Boolean,
      $filters: [ProductFilter!],
      $language: LanguageCode,
      $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
      localization {
        country {
          currency {
            isoCode
          }
        }
      }
      collection(handle: $handle) {
        ...CollectionFields
        products(
          first: $first,
          last: $last,
          after: $after,
          before: $before,
          sortKey: $sortKey,
          reverse: $reverse,
          filters: $filters
        ) {
          ...ProductConnectionFields
          filters {
            ...FilterFields
          }
        }
      }
    }
  `, {
    variables: {
      handle: handle.value,
      ...(before ? { last: perPage, before } : { first: perPage, after: params.get('after') ?? undefined }),
      sortKey,
      reverse,
      filters: filters as ProductFilter[],
      ...localization.value,
    },
    cache: 'long',
  })

  return {
    dataSearch,
    currencyCode: data?.localization.country.currency.isoCode,
    collection: data?.collection,
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

if (!data.value?.collection) {
  throw createError({
    status: 404,
    statusText: `${t('error.notFound')}: ${route.fullPath}`,
    message: t('error.collection'),
    fatal: true,
  })
}

const collection = computed(() => data.value?.collection)
const products = computed(() => flattenConnection(collection.value?.products))

const defaultSort = getSortByValue('COLLECTION_DEFAULT', false)

const sortOptions = computed(() => [
  { label: t('sort.featured'), value: defaultSort },
  { label: t('sort.bestSelling'), value: getSortByValue('BEST_SELLING', false) },
  { label: t('sort.titleAscending'), value: getSortByValue('TITLE', false) },
  { label: t('sort.titleDescending'), value: getSortByValue('TITLE', true) },
  { label: t('sort.priceAscending'), value: getSortByValue('PRICE', false) },
  { label: t('sort.priceDescending'), value: getSortByValue('PRICE', true) },
  { label: t('sort.createdAscending'), value: getSortByValue('CREATED', false) },
  { label: t('sort.createdDescending'), value: getSortByValue('CREATED', true) },
])

useSeoMeta({
  title: () => `${collection.value?.seo?.title ?? collection.value?.title} | ${shopName}`,
  description: () => collection.value?.seo?.description ?? collection.value?.description ?? t('seo.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('breadcrumb.collections'), to: localePath('/collections') },
        { label: collection?.title, to: localePath(`/collections/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ collection?.title }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ collection?.description }}
    </p>

    <CollectionBrowser
      v-if="data && collection"
      :handle="handle"
      :data-search="data.dataSearch"
      :filters="collection.products.filters"
      :currency-code="data.currencyCode"
      :sort-options="sortOptions"
      :default-sort="defaultSort"
    >
      <CollectionProducts
        :products="products"
        :page-info="collection.products.pageInfo"
        :pending="status === 'pending'"
      />
    </CollectionBrowser>

    <ShopifyCollectionView
      v-if="collection"
      :data="{ collection: { id: collection.id, handle } }"
    />
  </UContainer>
</template>
