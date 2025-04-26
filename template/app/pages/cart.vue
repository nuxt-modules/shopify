<script setup lang="ts">
import { ref } from 'vue'

const cart = await useCart()
const checkoutLoading = ref(false)

const handleCheckout = async () => {
    if (!cart.id.value) return

    try {
        checkoutLoading.value = true
        const { data, error } = await useFetch('/api/cart/checkout-url', {
            method: 'POST',
            body: { id: cart.id.value },
        })

        if (error.value) {
            throw new Error('Could not retrieve checkout URL')
        }

        const checkoutUrl = data.value?.cart?.checkoutUrl
        if (checkoutUrl) {
            // Redirect to the external checkout page
            window.location.href = checkoutUrl
        }
    }
    catch (err) {
        console.error('Checkout error:', err)
    }
    finally {
        checkoutLoading.value = false
    }
}

const handleRemoveItem = async (lineId: string) => {
    await cart.removeItems([lineId])
}
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <h1 class="text-3xl font-bold">
            Your Cart
        </h1>

        <div
            v-if="cart.cartItems.value.length === 0"
            class="text-lg text-gray-600"
        >
            Your cart is empty.
        </div>

        <div
            v-else
            class="flex flex-col gap-4"
        >
            <div class="flex flex-col gap-16">
                <template
                    v-for="item in cart.cartItems.value"
                    :key="item.id"
                >
                    <div
                        class="flex flex-row items-center justify-between gap-16 py-16"
                    >
                        <ProductImage
                            :product="item.node.merchandise.product"
                            padded
                        />

                        <div class="flex flex-col">
                            <span class="font-semibold text-lg">{{ item.node.merchandise.product.title }}</span>
                            <span class="text-sm text-gray-500">Quantity: {{ item.node.quantity }}</span>
                        </div>

                        <UButton
                            variant="outline"
                            color="error"
                            @click="handleRemoveItem(item.node.id)"
                        >
                            Remove
                        </UButton>
                    </div>
                    <USeparator />
                </template>
            </div>

            <div class="flex flex-row items-center justify-between mt-4">
                <div class="flex items-center gap-2">
                    <span class="text-xl font-bold">Total Items:</span>
                    <span class="text-xl font-bold">{{ cart.numItems }}</span>
                </div>
                <UButton
                    :disabled="checkoutLoading"
                    variant="solid"
                    color="primary"
                    @click="handleCheckout"
                >
                    Checkout
                </UButton>
            </div>
        </div>
    </div>
</template>
