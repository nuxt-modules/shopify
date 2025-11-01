<script setup lang="ts">
import { joinURL } from 'ufo'

const props = defineProps<{
    handle: string
}>()

const { data } = await useStorefrontData('product', `#graphql
    query GetProduct($handle: String!) {
        product(handle: $handle) {
            featuredImage {
                url
                altText
                width
                height
            }
        }
    }
`, {
    variables: props,
})

const url = joinURL('/shopify', new URL(data.value?.product?.featuredImage?.url ?? '').pathname)
</script>

<template>
    <NuxtImg
        class="rounded-sm overflow-hidden"
        :src="url"
        :alt="data?.product?.featuredImage?.altText ?? undefined"
        :width="data?.product?.featuredImage?.width ?? undefined"
        :height="data?.product?.featuredImage?.height ?? undefined"
    />
</template>
