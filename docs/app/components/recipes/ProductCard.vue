<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const price = computed(() => {
    const price = props.product.priceRange.minVariantPrice
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: price.currencyCode,
    }).format(Number(price.amount))
})

const image = computed(() => props.product.featuredImage)
const src = computed(() => image.value?.url ?? '')
const to = computed(() => `https://demostore.mock.shop/products/${props.product.handle}`)
</script>

<template>
    <UPageCard
        :key="props.product.id"
        :to="to"
        :title="props.product.title"
        :description="props.product.description"
        orientation="vertical"
        reverse
        :ui="{
            description: 'line-clamp-2',
            footer: 'w-full',
        }"
    >
        <template #header>
            <NuxtImg
                :src="src ?? undefined"
                :alt="image?.altText ?? undefined"
                :width="image?.width ?? undefined"
                :height="image?.height ?? undefined"
                sizes="xs:100vw sm:50vw md:33vw lg:33vw xl:33vw"
                class="rounded-sm"
            />
        </template>

        <template #footer>
            <div class="flex justify-between items-center w-full">
                <div class="font-semibold">
                    from {{ price }}
                </div>

                <UButton size="sm">
                    Add to Cart
                </UButton>
            </div>
        </template>
    </UPageCard>
</template>
