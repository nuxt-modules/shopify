<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

import { getSortByValue, parseCollectionParams } from '@shopify/hydrogen'

const { shopify: { shopName, collection: { perPage } } } = useAppConfig()
const { params: localization } = useLocalization()
const localePath = useLocalePath()
const storefront = useStorefront()
const search = useRouteSearch()
const { t } = useI18n()

const { data, error, status } = await useAsyncData(localizedKey('search'), async () => {
  const dataSearch = search.value
  const params = new URLSearchParams(dataSearch)
  const term = params.get('q')?.trim() ?? ''

  if (!term) return { dataSearch, term }

  const { filters, sortKey, reverse } = parseCollectionParams(params)
  const before = params.get('before')

  const { data } = await storefront.request(`#graphql
    query FetchSearchResults(
      $term: String!,
      $first: Int,
      $last: Int,
      $after: String,
      $before: String,
      $sortKey: SearchSortKeys,
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
      search(
        query: $term,
        types: [PRODUCT],
        first: $first,
        last: $last,
        after: $after,
        before: $before,
        sortKey: $sortKey,
        reverse: $reverse,
        productFilters: $filters
      ) {
        totalCount
        productFilters {
          ...FilterFields
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          __typename
          ... on Product {
            ...ProductFields
          }
        }
      }
    }
  `, {
    variables: {
      term,
      ...(before ? { last: perPage, before } : { first: perPage, after: params.get('after') ?? undefined }),
      sortKey: sortKey === 'PRICE' ? 'PRICE' : 'RELEVANCE',
      reverse: sortKey === 'PRICE' && reverse,
      filters: filters as ProductFilter[],
      ...localization.value,
    },
    cache: 'short',
  })

  return {
    dataSearch,
    term,
    currencyCode: data?.localization.country.currency.isoCode,
    results: data?.search,
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

const term = computed(() => data.value?.term ?? '')
const results = computed(() => data.value?.results)
const products = computed(() => results.value?.nodes.filter(node => node.__typename === 'Product') ?? [])

const defaultSort = getSortByValue('RELEVANCE', false)

const sortOptions = computed(() => [
  { label: t('sort.relevance'), value: defaultSort },
  { label: t('sort.priceAscending'), value: getSortByValue('PRICE', false) },
  { label: t('sort.priceDescending'), value: getSortByValue('PRICE', true) },
])

useSeoMeta({
  title: () => `${term.value ? t('search.results', { term: term.value }) : t('search.label')} | ${shopName}`,
  description: () => t('search.description'),
  robots: 'noindex, follow',
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: $t('search.label') }]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ $t('search.label') }}
    </h1>

    <form
      method="get"
      :action="localePath('/search')"
      role="search"
      class="flex gap-2 max-w-xl mb-10 lg:mb-12"
    >
      <UInput
        :key="term"
        name="q"
        type="search"
        :default-value="term"
        :placeholder="$t('search.placeholder')"
        :aria-label="$t('search.label')"
        autocomplete="off"
        icon="i-lucide-search"
        size="xl"
        class="grow"
      />

      <UButton
        type="submit"
        size="xl"
        :label="$t('search.submit')"
      />
    </form>

    <CollectionBrowser
      v-if="data && results"
      :handle="`search:${term}`"
      :data-search="data.dataSearch"
      :filters="results.productFilters"
      :currency-code="data.currencyCode"
      :sort-options="sortOptions"
      :default-sort="defaultSort"
      :term="term"
      :summary="$t('search.count', { term, count: results.totalCount }, results.totalCount)"
    >
      <CollectionProducts
        :products="products"
        :page-info="results.pageInfo"
        :pending="status === 'pending'"
      />
    </CollectionBrowser>

    <p
      v-else
      class="text-lg text-muted"
    >
      {{ $t('search.prompt') }}
    </p>

    <ShopifySearchView
      v-if="term && results"
      :data="{ searchTerm: term, searchResults: { totalCount: results.totalCount } }"
    />
  </UContainer>
</template>
