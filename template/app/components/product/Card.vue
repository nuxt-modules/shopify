<script setup lang="ts">
import type { FetchCollectionQuery } from '#shopify/storefront'

import { z } from 'zod'

import { useCart } from '#imports'

const props = defineProps<{
    product: FetchCollectionQuery['collection']['products']['edges']
    index: number
    padded?: boolean
}>()

const _emit = defineEmits<{
    (e: 'addToCart', quantity: number): void
}>()

const schema = z.object({
    merchandiseId: z.string(),
    quantity: z.number().min(1),
})

const state = reactive<z.infer<typeof schema>>({
    merchandiseId: props.product?.node.variants.edges[0].node.id,
    quantity: 1,
})

const { addItems } = await useCart()
const _imgLoading = ref(true)

const price = computed(() => {
    const formatter = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
    })

    return formatter.format(props.product.node.priceRange.minVariantPrice.amount)
})

const handleAddToCart = async (quantity: number) => {
    await addItems({
        merchandiseId: props.product.node.variants.edges[0].node.id,
        quantity,
    })
}
</script>

<template>
    <div class="flex flex-row">
        <UCard class="flex flex-col">
            <div class="relative flex flex-col gap-4">
                <NuxtLink
                    :to="getProductAppUrl(props.product.node.handle)"
                    class="flex flex-col gap-4"
                >
                    <ProductImage
                        :product="props.product.node"
                        :padded="props.padded"
                    />

                    <div class="flex flex-row justify-between">
                        <span class="text-sm text-gray-500">
                            quality: <span class="text-emerald-400 font-bold">good</span>
                        </span>

                        <span class="block font-bold text-sm">
                            {{ price }}
                        </span>
                    </div>

                    <h2 class="font-bold">
                        {{ props.product.node.title }}
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
                            color="secondary"
                            type="submit"
                            @click.prevent="handleAddToCart(state.quantity)"
                        />
                    </div>
                </UForm>
            </div>
        </UCard>
    </div>
</template>
