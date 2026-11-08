<script setup lang="ts">
import type { ValidProductSelectionResult } from '@shopify/hydrogen'

import { getSelectedProductOptions } from '@shopify/hydrogen'

import { ProductProvider } from '~/utils/product-form'

definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const router = useRouter()
const route = useRoute()

const handle = computed(() => route.params.handle as string)
const selectedOptions = computed(() => getSelectedProductOptions({ searchParams: toSearchParams(route.query) }))

const { params: localization } = useLocalization()

const { data: product, error, status } = await useStorefrontData(localizedKey('product', handle), `#graphql
  query FetchProduct($handle: String, $selectedOptions: [SelectedOptionInput!], $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    product(handle: $handle) {
      ...ProductFormFields
      vendor
      description
      seo {
        title
        description
      }
    }
  }
`, {
  variables: computed(() => productInputSchema.parse({
    handle: handle.value,
    selectedOptions: selectedOptions.value,
    ...localization.value,
  })),
  transform: data => data?.product,
  watch: [selectedOptions],
  cache: 'long',
})

if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message,
    fatal: true,
  })
}

if (!product.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: $t('error.product'),
    fatal: true,
  })
}

const { data: recommendations } = await useStorefrontData(localizedKey('product-recommendations', handle), `#graphql
  query FetchProductRecommendations($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    productRecommendations(productHandle: $handle) {
      ...ProductFields
    }
  }
`, {
  variables: computed(() => productInputSchema.parse({
    handle: handle.value,
    ...localization.value,
  })),
  transform: data => data?.productRecommendations,
  cache: 'long',
})

const variant = computed(() => product.value?.selectedOrFirstAvailableVariant)

useSeoMeta({
  title: `${product.value?.seo.title ?? product.value?.title} | ${shopName}`,
  ogTitle: product.value?.seo.title ?? product.value?.title,
  description: product.value?.seo.description ?? product.value?.description ?? $t('seo.description'),
})

const select = (result: ValidProductSelectionResult) => router.replace(productSelectionPath(
  localePath(`/products/${result.selectedVariant?.product?.handle ?? handle.value}`),
  result.selectedOptions,
  product.value?.options.map(option => option.name) ?? [],
  route.query,
))
</script>

<template>
  <UContainer class="py-6 pb-12 lg:py-8 lg:pb-16">
    <UBreadcrumb
      :items="[
        { label: $t('breadcrumb.products'), to: localePath('/collections/all') },
        { label: product?.title, to: localePath(`/products/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div
      v-if="product"
      class="mb-12 lg:grid lg:grid-cols-12 lg:mb-16"
    >
      <ProductProvider
        :product="product"
        :on-select="select"
      >
        <ProductGallery
          :product="product"
          class="lg:col-span-6"
          thumbnails
        />

        <div class="lg:col-span-4 lg:col-start-8">
          <div class="lg:sticky lg:top-[calc(var(--ui-header-height)+3rem)]">
            <ProductConfigurator
              :product="product"
              :query="route.query"
              :loading="status === 'pending'"
              class="mb-12 lg:mb-16"
            />

            <p class="mb-6 lg:text-lg lg:mb-8">
              {{ product.description }}
            </p>
          </div>
        </div>
      </ProductProvider>
    </div>

    <div v-if="recommendations">
      <h2 class="text-3xl text-gray-900 font-bold mb-6 lg:mb-8 lg:text-4xl">
        {{ $t('product.recommendations') }}
      </h2>

      <div class="mb-12 sm:px-12 lg:mb-16">
        <UCarousel
          v-slot="{ item }"
          :items="recommendations"
          :ui="{ item: 'md:basis-1/2 lg:basis-1/3' }"
          class="w-full mb-6"
          arrows
          loop
        >
          <ProductCard :product="item" />
        </UCarousel>
      </div>
    </div>

    <ShopifyProductView
      v-if="product && variant"
      :data="{
        products: [{
          id: product.id,
          title: product.title,
          vendor: product.vendor,
          price: variant.price,
          variantId: variant.id,
          variantTitle: variant.title,
          quantity: 1,
        }],
      }"
    />
  </UContainer>
</template>
