<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: Partial<ProductFieldsFragment>
    size?: 'sm' | 'md' | 'lg'
    padded?: boolean
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
            {
                'p-4': props.padded,
            },
        ]"
        class="aspect-square rounded-lg bg-[#D8DBDF]"
    >
        <NuxtImg
            :src="props.product.featuredImage?.url"
            :alt="props.product.title"
            placeholder
            class="aspect-square max-w-full rounded-lg animate-pop-up select-none"
            @load="handleImageLoad"
        />
    </div>
</template>
