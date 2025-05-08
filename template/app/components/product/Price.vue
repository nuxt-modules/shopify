<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'
import type { Serialized } from '#shopify/utils'

const props = defineProps<{
    product: Serialized<ProductFieldsFragment>
}>()

const { country } = useCountry()
const { locale } = useI18n()

const price = computed(() => {
    const currencyCode = props.product.priceRange.minVariantPrice.currencyCode

    const formatter = new Intl.NumberFormat(`${locale.value}-${country.value}`, {
        style: 'currency',
        currency: currencyCode,
    })

    // @ts-expect-error TODO: Fix type error
    return formatter.format(props.product.priceRange.minVariantPrice.amount)
})
</script>

<template>
    <span class="block font-bold text-sm">
        {{ price }}
    </span>
</template>
