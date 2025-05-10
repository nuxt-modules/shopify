<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'
import type { Serialized } from '#shopify/utils'

const props = defineProps<{
    product?: Serialized<ProductFieldsFragment> | null
    inline?: boolean
}>()

const { country } = useCountry()
const { locale } = useI18n()

const price = computed(() => {
    const currencyCode = props.product?.priceRange.minVariantPrice.currencyCode

    if (!currencyCode) return ''

    const formatter = new Intl.NumberFormat(`${locale.value}-${country.value}`, {
        style: 'currency',
        currency: currencyCode,
    })

    // @ts-expect-error TODO: Fix type error
    return formatter.format(props.product.priceRange.minVariantPrice.amount)
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

        {{ price }}

        <template v-if="props.inline">
            ]
        </template>
    </span>
</template>
