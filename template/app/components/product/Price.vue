<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product?: ProductFieldsFragment | null
    quantity?: number
    inline?: boolean
}>()
</script>

<template>
    <span
        v-if="props.product"
        :class="{
            'block font-medium text-right': !props.inline,
            'sm:opacity-80': props.inline,
        }"
    >
        <template v-if="props.inline">
            [
        </template>

        <template v-if="props.quantity && props.quantity > 1">
            {{ props.quantity }} x
        </template>

        <Price :price="props.product.priceRange.minVariantPrice" />

        <template v-if="props.inline">
            ]
        </template>
    </span>
</template>
