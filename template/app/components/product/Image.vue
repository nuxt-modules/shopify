<script setup lang="ts">
import type { Image } from '#shopify/storefront'

const props = defineProps<{
    image?: Partial<Image>
    title?: string
    loading?: 'eager' | 'lazy'
}>()

const emits = defineEmits<{
    (e: 'load'): void
}>()

const imgLoading = ref(true)

const url = computed(() => props.image?.url)

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
        class="max-w-full rounded-md overflow-hidden"
    >
        <NuxtImg
            provider="shopify"
            :src="url"
            :alt="props.image?.altText ?? props.title ?? undefined"
            :width="props.image?.width ?? undefined"
            :height="props.image?.height ?? undefined"
            sizes="xs:100vw md:50vw lg:40vw xl:25vw"
            class="aspect-square max-w-full max-h-full animate-pop-up select-none object-contain"
            :loading="props.loading ?? 'lazy'"
            placeholder
            @load="handleImageLoad"
        />
    </div>
</template>
