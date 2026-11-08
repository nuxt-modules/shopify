<script setup lang="ts">
import type { CommandPaletteGroup } from '@nuxt/ui'

import { formatMoney, getPredictiveSearchItemUrl, getSearchResultUrl } from '@shopify/hydrogen'
import { usePredictiveSearch, usePredictiveSearchActions } from '@shopify/hydrogen/vue'

const props = defineProps<{
  suggestions?: FetchSearchSuggestionsQuery | null
}>()

const emit = defineEmits<{
  close: []
}>()

const routeTemplates = useRuntimeConfig().public._shopify?.routeTemplates ?? {}
const localePath = useLocalePath()
const { locale } = useI18n()

const result = usePredictiveSearch(state => state.result)
const loading = usePredictiveSearch(state => state.status === 'loading')
const error = usePredictiveSearch(state => state.error)

const { search } = usePredictiveSearchActions()

const searchTerm = ref('')

const suggestionGroups = computed(() => {
  const { products, collections, articles } = props.suggestions ?? {}

  return [
    {
      id: 'products',
      label: $t('search.products'),
      items: products?.nodes.map((product) => {
        const variant = product.selectedOrFirstAvailableVariant

        return {
          label: product.title,
          suffix: variant ? formatMoney(variant.price, { locale: locale.value }).toString() : undefined,
          to: localePath(`/products/${product.handle}`),
          avatar: variant?.image ? { src: variant.image.url, alt: variant.image.altText ?? undefined } : undefined,
          onSelect: () => emit('close'),
        }
      }),
    },
    {
      id: 'collections',
      label: $t('search.collections'),
      items: collections?.nodes.map(collection => ({
        label: collection.title,
        to: localePath(`/collections/${collection.handle}`),
        avatar: collection.image ? { src: collection.image.url, alt: collection.image.altText ?? undefined } : undefined,
        onSelect: () => emit('close'),
      })),
    },
    {
      id: 'articles',
      label: $t('search.articles'),
      items: articles?.nodes.map(article => ({
        label: article.title,
        to: localePath(`/blogs/${article.blog.handle}/${article.handle}`),
        avatar: article.image ? { src: article.image.url, alt: article.image.altText ?? undefined } : undefined,
        onSelect: () => emit('close'),
      })),
    },
  ]
})

const groups = computed<CommandPaletteGroup[]>(() => {
  const term = searchTerm.value.trim()

  if (!term) return suggestionGroups.value

  const { queries, products, collections, articles } = result.value.items
  const link = { routes: routeTemplates, term: result.value.term, pathPrefix: localePath('/') }

  return [
    {
      id: 'all',
      ignoreFilter: true,
      items: [{
        label: $t('search.all', { term }),
        icon: 'i-lucide-search',
        to: getSearchResultUrl({ baseUrl: localePath('/search'), term }),
        onSelect: () => emit('close'),
      }],
    },
    {
      id: 'queries',
      label: $t('search.queries'),
      ignoreFilter: true,
      items: queries.map(query => ({
        label: query.text,
        to: getPredictiveSearchItemUrl(query, { routes: routeTemplates, pathPrefix: localePath('/') }),
        onSelect: () => emit('close'),
      })),
    },
    {
      id: 'products',
      label: $t('search.products'),
      ignoreFilter: true,
      items: products.map((product) => {
        const variant = product.selectedOrFirstAvailableVariant

        return {
          label: product.title,
          suffix: variant ? formatMoney(variant.price, { locale: locale.value }).toString() : undefined,
          to: getPredictiveSearchItemUrl(product, link),
          avatar: variant?.image ? { src: variant.image.url, alt: variant.image.altText ?? undefined } : undefined,
          onSelect: () => emit('close'),
        }
      }),
    },
    {
      id: 'collections',
      label: $t('search.collections'),
      ignoreFilter: true,
      items: collections.map(collection => ({
        label: collection.title,
        to: getPredictiveSearchItemUrl(collection, link),
        avatar: collection.image ? { src: collection.image.url, alt: collection.image.altText ?? undefined } : undefined,
        onSelect: () => emit('close'),
      })),
    },
    {
      id: 'articles',
      label: $t('search.articles'),
      ignoreFilter: true,
      items: articles.map(article => ({
        label: article.title,
        to: getPredictiveSearchItemUrl(article, link),
        avatar: article.image ? { src: article.image.url, alt: article.image.altText ?? undefined } : undefined,
        onSelect: () => emit('close'),
      })),
    },
  ]
})

watch(searchTerm, search)
</script>

<template>
  <UCommandPalette
    v-model:search-term="searchTerm"
    :loading="loading"
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
      itemTrailingIcon: 'hidden',
    }"
    @update:open="emit('close')"
  >
    <template
      v-if="error"
      #footer
    >
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="$t('search.error')"
        :description="error"
      />
    </template>
  </UCommandPalette>
</template>
