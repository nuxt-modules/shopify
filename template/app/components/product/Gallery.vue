<script setup lang="ts">
import type { ProductFieldsFragment, ProductVariantFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
  product: ProductFieldsFragment
  selectedVariant?: ProductVariantFieldsFragment
  thumbnails?: boolean
}>()

const carousel = useTemplateRef('carousel')

const images = computed(() => flattenConnection(props.product.images))
const media = computed(() => flattenConnection(props.product.media))

const sliderMedia = computed(() => {
  const variantImage = props.selectedVariant?.image

  if (!variantImage) return media.value

  const rest = media.value.filter(item => (item.__typename === 'MediaImage'
    ? item.image?.url
    : item.previewImage?.url) !== variantImage.url)

  const selected = media.value.find(item => item.__typename === 'MediaImage'
    && item.image?.url === variantImage.url)

  return selected ? [selected, ...rest] : media.value
})

watch(() => props.selectedVariant, () => carousel.value?.emblaApi?.scrollTo(0))
</script>

<template>
  <div class="w-full">
    <UCarousel
      v-if="sliderMedia.length > 1"
      ref="carousel"
      v-slot="{ item, index }"
      :items="sliderMedia"
      :ui="{
        prev: 'left-3!',
        next: 'right-3!',
      }"
      class="mb-6 lg:mb-8"
      arrows
      loop
    >
      <ProductMedia
        :media="item"
        :loading="index === 0 ? 'eager' : 'lazy'"
        :title="`${props.product.title}${index !== 0 ? ` (${index})` : ''}`"
      />
    </UCarousel>

    <ProductMedia
      v-else-if="sliderMedia[0]"
      :media="sliderMedia[0]"
      :title="props.product.title"
      class="mb-6 lg:mb-8"
      loading="eager"
    />

    <div
      v-if="props.thumbnails && images.length > 1"
      class="hidden lg:grid grid-cols-12 gap-8 mb-6 lg:mb-8"
    >
      <ProductImage
        v-for="(image, index) in images"
        :key="image.url"
        :image="image ?? undefined"
        :title="`${props.product.title} Thumbnail ${index !== 0 ? ` (${index})` : ''}`"
        class="col-span-6"
      />
    </div>
  </div>
</template>
