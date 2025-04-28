<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: Partial<ProductFieldsFragment>
    size?: 'sm' | 'md' | 'lg'
}>()

const emits = defineEmits<{
    (e: 'load'): void
}>()

const imgLoading = ref(true)

const handleImageLoad = () => requestAnimationFrame(() => {
    imgLoading.value = false
    emits('load')
})
</script>

<template>
    <div
        :class="[
            imgLoading ? 'animate-pulse' : '',
            {
                'max-w-full': !props.size,
                'max-w-64': props.size === 'sm',
                'max-w-128': props.size === 'md',
                'max-w-256': props.size === 'lg',
            },
        ]"
        class="aspect-square flex items-center justify-center"
    >
        <NuxtImg
            :src="props.product.featuredImage?.url"
            :alt="props.product.title"
            placeholder
            class="max-w-full max-h-full animate-pop-up select-none grow-0 shrink-0"
            @load="handleImageLoad"
        />
    </div>
</template>
