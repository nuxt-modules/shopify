<script setup lang="ts">
import { joinURL } from 'ufo';

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
</script>

<template>
    <NuxtImg
        :src="joinURL('/shopify', new URL(data?.product?.featuredImage?.url ?? '').pathname)"
        :alt="data?.product?.featuredImage?.altText ?? undefined"
        :width="data?.product?.featuredImage?.width ?? undefined"
        :height="data?.product?.featuredImage?.height ?? undefined"
    />
</template>
