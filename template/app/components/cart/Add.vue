<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const { add } = useCart()

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const addToCart = async () => {
    const variant = flattenConnection(props.product.variants)[0]

    if (variant) {
        await add(variant.id, 1)
    }
}
</script>

<template>
    <UButton
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-shopping-bag"
        :label="$t('product.add')"
        :ui="{
            trailingIcon: 'size-5',
            label: [
                'ms-auto',
                'max-w-0',
                'invisible',
                'group-focus:visible',
                'group-focus:max-w-full',
                'group-hover:visible',
                'group-hover:max-w-full',
                'transition-all',
                'duration-300',
                'truncate-0',
                'ps-1.5',
                'pe-1',
            ],
            base: 'absolute bottom-0 group rounded-full p-2.5',
        }"
        @click="addToCart"
    />
</template>
