<script setup lang="ts">
import type { ProductFilter } from '#shopify/storefront'

const props = defineProps<{
  first?: number
  last?: number
  after?: string
  before?: string
  sortKey?: string
  reverse?: boolean
  filters?: ProductFilter[]
  loading?: 'eager' | 'lazy'
}>()

const { language, country } = useLocalization()
const { locale } = useI18n()

const key = computed(() => `product-slider-${Object.values(props).join('-')}-${locale.value}`)

const first = computed(() => props.first ? Number(props.first) : undefined)
const last = computed(() => props.last ? Number(props.last) : undefined)
const after = computed(() => props.after ? String(props.after) : undefined)
const before = computed(() => props.before ? String(props.before) : undefined)

const sortKey = computed(() => props.sortKey ? String(props.sortKey) : undefined)
const reverse = computed(() => props.reverse ? Boolean(props.reverse) : undefined)
const filters = computed(() => props.filters ? props.filters : undefined)

const { data: products } = await useStorefrontData(key, `#graphql
  query FetchSliderProducts(
    $after: String,
    $before: String,
    $first: Int,
    $last: Int,
    $language: LanguageCode,
    $country: CountryCode
  )
  @inContext(language: $language, country: $country) { 
    products(
      after: $after,
      before: $before,
      first: $first,
      last: $last,
    ) {
      ...ProductConnectionFields
    }
  }
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
  ${PRODUCT_CONNECTION_FRAGMENT}
`, {
  variables: productConnectionParamsSchema.extend(localizationParamsSchema.shape).parse({
    first: first.value,
    last: last.value,
    after: after.value,
    before: before.value,
    sortKey: sortKey.value,
    reverse: reverse.value,
    filters: filters.value,
    language: language.value,
    country: country.value,
  }),
  transform: data => flattenConnection(data?.products),
  cache: 'long',
})
</script>

<template>
  <UCarousel
    v-slot="{ item: product, index }"
    :items="products ?? []"
    class="w-full mb-6"
    :ui="{ item: 'md:basis-1/2 lg:basis-1/3' }"
    arrows
  >
    <ProductCard
      :product="product"
      :loading="index < 3 ? props.loading : 'lazy'"
    />
  </UCarousel>
</template>
