<script setup lang="ts">
import type { ProductFieldsFragment, ProductVariantFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: ProductFieldsFragment
    selectedVariant?: ProductVariantFieldsFragment
    thumbnails?: boolean
}>()

const carousel = useTemplateRef('carousel')

const images = computed(() => flattenConnection(props.product.images))

const sliderImages = computed(() => {
    if (props.selectedVariant?.image) {
        const variantImage = props.selectedVariant.image

        return [
            variantImage,
            ...images.value.filter(image => image.url !== variantImage.url),
        ]
    }

    return images.value
})

watch(() => props.selectedVariant, () => carousel.value?.emblaApi?.scrollTo(0))
</script>

<template>
    <div class="w-full">
        <UCarousel
            v-if="sliderImages.length > 1"
            ref="carousel"
            v-slot="{ item, index }"
            :items="sliderImages"
            :ui="{
                prev: 'left-3!',
                next: 'right-3!',
            }"
            class="mb-6 lg:mb-8"
            arrows
            loop
        >
            <ProductImage
                :image="item"
                :loading="index === 0 ? 'eager' : 'lazy'"
            />
        </UCarousel>

        <ProductImage
            v-else
            :image="sliderImages[0]"
            class="mb-6 lg:mb-8"
            loading="eager"
        />

        <div
            v-if="props.thumbnails && images.length > 1"
            class="hidden lg:grid grid-cols-12 gap-8 mb-6 lg:mb-8"
        >
            <ProductImage
                v-for="image in images"
                :key="image.url"
                :image="image ?? undefined"
                class="col-span-6"
            />
        </div>
    </div>
</template>
