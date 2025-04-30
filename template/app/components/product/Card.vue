<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'
import type { Serialized } from '#shopify/utils'

import { z } from 'zod'

const props = defineProps<{
    product: Serialized<ProductFieldsFragment>
}>()

const schema = z.object({
    quantity: z.number().min(1),
})

const state = reactive<z.infer<typeof schema>>({
    quantity: 1,
})

const { addItems } = await useCart()

const price = computed(() => {
    const formatter = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
    })

    // @ts-expect-error TODO: Fix type error
    return formatter.format(props.product.priceRange.minVariantPrice.amount)
})

const handleAddToCart = async (quantity: number) => {
    await addItems({
        quantity,
    })
}
</script>

<template>
    <div class="flex flex-row max-w-full">
        <UCard
            class="flex flex-col max-w-full h-full"
            variant="soft"
            :ui="{
                body: 'h-full',
                root: 'rounded-none !bg-transparent',
            }"
        >
            <div class="relative flex flex-col gap-4 h-full">
                <NuxtLink
                    :to="getProductAppUrl(props.product.handle)"
                    class="flex flex-col gap-4 grow"
                >
                    <ProductImage :product="props.product" />

                    <div class="flex flex-row justify-between">
                        <span class="block font-bold text-sm">
                            {{ price }}
                        </span>
                    </div>

                    <h2 class="font-bold">
                        {{ props.product.title }}
                    </h2>
                </NuxtLink>

                <UForm
                    :state="state"
                    :schema="schema"
                    :validate-on="['change']"
                    class="flex flex-col gap-4"
                >
                    <div class="flex flex-row gap-4 justify-between">
                        <UFormField
                            name="quantity"
                            class="w-24"
                        >
                            <UInputNumber
                                v-model="state.quantity"
                                :min="1"
                                :max="10"
                            />
                        </UFormField>

                        <UButton
                            :trailing-icon="icons.cartAdd"
                            label="Add to cart"
                            variant="soft"
                            type="submit"
                            class="cursor-pointer"
                            @click.prevent="handleAddToCart(state.quantity)"
                        />
                    </div>
                </UForm>
            </div>
        </UCard>
    </div>
</template>
