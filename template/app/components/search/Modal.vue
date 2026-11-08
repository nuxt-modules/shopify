<script setup lang="ts">
import { PredictiveSearchProvider } from '@shopify/hydrogen/vue'

const open = ref(false)
const localePath = useLocalePath()
const route = useRoute()

const { params: localization } = useLocalization()

const { data: suggestions } = useStorefrontData(localizedKey('search-suggestions'), `#graphql
  query FetchSearchSuggestions($language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    products(first: 5, sortKey: BEST_SELLING) {
      nodes {
        handle
        title
        selectedOrFirstAvailableVariant {
          image {
            ...ImageFields
          }
          price {
            ...PriceFields
          }
        }
      }
    }
    collections(first: 5) {
      nodes {
        handle
        title
        image {
          ...ImageFields
        }
      }
    }
    articles(first: 5, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        handle
        title
        blog {
          handle
        }
        image {
          ...ImageFields
        }
      }
    }
  }
`, {
  variables: localization,
  cache: 'long',
})

const openSearch = (event: MouseEvent) => {
  event.preventDefault()

  open.value = true
}

watch(() => route.fullPath, () => open.value = false)
</script>

<template>
  <UButton
    :to="localePath('/search')"
    icon="i-lucide-search"
    variant="ghost"
    color="neutral"
    :label="$t('search.label')"
    aria-haspopup="dialog"
    :ui="{
      label: 'sr-only min-[420px]:not-sr-only',
    }"
    @click="openSearch"
  />

  <UModal
    v-model:open="open"
    :title="$t('search.label')"
    :description="$t('search.description')"
    :ui="{
      content: 'max-w-2xl',
    }"
  >
    <template #content>
      <PredictiveSearchProvider
        :types="['QUERY', 'PRODUCT', 'COLLECTION', 'ARTICLE']"
        :search-action="localePath('/search')"
      >
        <SearchPalette
          :suggestions="suggestions"
          @close="open = false"
        />
      </PredictiveSearchProvider>
    </template>
  </UModal>
</template>
