<script setup lang="ts">
import type { ProductConnectionFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    products: ProductConnectionFieldsFragment['edges']
}>()
</script>

<template>
    <div
        v-for="(product, index) in props.products"
        :key="product.node.id"
        class="relative"
    >
        <ProductCard
            :product="product.node"
            class="h-full"
        />

        <USeparator
            orientation="vertical"
            :ui="{
                root: [
                    'absolute',
                    '-right-8',
                    'top-0',
                    'h-full',
                    'transition-colors',
                    'duration-200',
                    'hidden',
                    ...[index % 2 > 0 ? 'md:hidden' : 'md:block'],
                    ...[index % 3 > 1 ? 'xl:hidden' : 'xl:block'],
                ],
            }"
        />

        <USeparator
            orientation="horizontal"
            :ui="{
                root: [
                    'absolute',
                    '-bottom-8',
                    'left-0',
                    'w-full',
                    'transition-colors',
                    'duration-200',
                ],
            }"
        />
    </div>
</template>
