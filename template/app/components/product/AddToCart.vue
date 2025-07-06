<script setup lang="ts">
const props = defineProps<{
    product: ProductFieldsFragment
    quantity: number
    trailingIcon?: boolean
    ui?: {
        label?: string
        price?: string
    }
}>()

const { t } = useI18n()
</script>

<template>
    <UButton
        size="lg"
        color="primary"
        variant="soft"
        :icon="!trailingIcon ? 'hugeicons:shopping-bag-01' : undefined"
        :trailing-icon="trailingIcon ? 'hugeicons:shopping-bag-01' : undefined"
        class="cursor-pointer flex items-center justify-center grow rounded-full"
        :ui="{ base: 'ring ring-primary' }"
    >
        <span :class="props.ui?.label">{{ t('product.addToCart') }}</span>

        <ProductPrice
            :product="props.product"
            :quantity="props.quantity"
            :class="props.ui?.price"
            inline
        />
    </UButton>
</template>
