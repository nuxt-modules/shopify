<script setup lang="ts">
const props = defineProps<{
    product?: ProductFieldsFragment
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
        class="flex items-center justify-center max-w-full rounded-md overflow-hidden"
    >
        <NuxtImg
            provider="shopify"
            :src="url"
            :alt="props.product?.featuredImage?.altText ?? props.product?.title ?? undefined"
            :width="props.product?.featuredImage?.width ?? undefined"
            :height="props.product?.featuredImage?.height ?? undefined"
            sizes="xs:100vw md:50vw lg:40vw xl:25vw"
            class="aspect-square max-w-full max-h-full animate-pop-up select-none object-contain"
            placeholder
            @load="handleImageLoad"
        />
    </div>
</template>
