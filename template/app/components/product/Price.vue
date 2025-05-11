<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'
import type { Serialized } from '#shopify/utils'

const props = defineProps<{
    product?: Serialized<ProductFieldsFragment> | null
    quantity?: number
    inline?: boolean
}>()

const { country } = useCountry()
const { locale } = useI18n()

const price = computed(() => {
    const currencyCode = props.product?.priceRange.minVariantPrice.currencyCode

    if (!currencyCode) return ''

    const rawPrice = Number(props.product.priceRange.minVariantPrice.amount)

    const formatter = new Intl.NumberFormat(`${locale.value}-${country.value}`, {
        style: 'currency',
        currency: currencyCode,
    })

    return formatter.format(rawPrice)
})
</script>

<template>
    <span
        v-if="props.product"
        :class="{
            'block font-medium text-muted text-xl': !props.inline,
            'opacity-70': props.inline,
        }"
    >
        <template v-if="props.inline">
            [
        </template>

        <template v-if="props.quantity && props.quantity > 1">
            {{ props.quantity }} x
        </template>

        {{ price }}

        <template v-if="props.inline">
            ]
        </template>
    </span>
</template>
