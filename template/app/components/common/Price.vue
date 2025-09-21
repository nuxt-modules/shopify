<script setup lang="ts">
import type { PriceFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    price: PriceFieldsFragment
}>()

const { locale } = useI18n()

const price = computed(() => {
    const currencyCode = props.price?.currencyCode

    if (!currencyCode) return ''

    const rawPrice = Number(props.price.amount)

    const formatter = new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currencyCode,
    })

    return formatter.format(rawPrice)
})
</script>

<template>
    <span>
        {{ price }}
    </span>
</template>
