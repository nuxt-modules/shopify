<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'
import type { Serialized } from '#shopify/utils'

const props = defineProps<{
    product?: Serialized<ProductFieldsFragment>
    title?: string
}>()

const emits = defineEmits<{
    (e: 'load'): void
}>()

const imgLoading = ref(true)

const url = computed(() => (props.product?.featuredImage as { url: string })?.url)

const handleImageLoad = () => requestAnimationFrame(() => {
    imgLoading.value = false
    emits('load')
})
</script>

<template>
    <div
        :class="{
            'animate-pulse': imgLoading,
        }"
        class="aspect-square flex items-center justify-center max-w-full"
    >
        <NuxtImg
            provider="shopify"
            :src="url"
            :alt="props.product?.featuredImage?.altText ?? props.product?.title ?? undefined"
            :width="props.product?.featuredImage?.width ?? undefined"
            :height="props.product?.featuredImage?.height ?? undefined"
            sizes="xs:100vw md:50vw lg:40vw xl:25vw"
            placeholder
            class="max-w-full max-h-full animate-pop-up select-none grow-0 shrink-0"
            @load="handleImageLoad"
        />
    </div>
</template>
