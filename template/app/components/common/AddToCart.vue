<script setup lang="ts">
import type { ButtonProps } from '#ui/types'

const props = defineProps<ButtonProps & {
    variantId: string
    quantity?: number
}>()

const { add } = useCart()
const { t } = useI18n()

const loading = ref(false)

const addToCart = async (variantId: string, quantity = 1) => {
    loading.value = true

    add(variantId, quantity).then(() => loading.value = false)
}
</script>

<template>
    <UButton
        v-bind="props"
        :label="t('product.addToCart')"
        :ui="{
            trailingIcon: props.ui?.trailingIcon + (loading ? ' animate-spin' : ''),
        }"
        :disabled="props.disabled || loading"
        :trailing-icon="loading ? 'i-lucide-loader-circle' : 'i-lucide-shopping-cart'"
        @click="addToCart(props.variantId, props.quantity)"
    />
</template>
