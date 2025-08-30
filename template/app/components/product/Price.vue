<script setup lang="ts">
const props = defineProps<{
    product?: ProductFieldsFragment | null
    quantity?: number
    inline?: boolean
}>()

const { locale } = useI18n()

const price = computed(() => {
    const currencyCode = props.product?.priceRange.minVariantPrice.currencyCode

    if (!currencyCode) return ''

    const rawPrice = Number(props.product.priceRange.minVariantPrice.amount)

    const formatter = new Intl.NumberFormat(locale.value, {
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

        {{ price }}

        <template v-if="props.inline">
            ]
        </template>
    </span>
</template>
