<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const localePath = useLocalePath()

const url = computed(() => localePath(`/product/${props.product.handle}`))
const variant = computed(() => props.product.variants.edges[0]?.node)

const schema = z.object({
    quantity: z.number().min(1).max(10),
})

const state = reactive<z.infer<typeof schema>>({
    quantity: 1,
})
</script>

<template>
    <UCard
        class="flex flex-col max-w-full h-full"
        variant="soft"
        :ui="{
            body: 'h-full !p-0',
            root: 'rounded-none !bg-transparent',
        }"
    >
        <NuxtLink
            :to="url"
        >
            <ProductImage
                :product="props.product"
                class="mb-6"
            />

            <div class="flex justify-between items-center mb-6">
                <p class="font-headings font-medium text-lg">
                    {{ props.product.title }}
                </p>

                <Price
                    v-if="variant"
                    :price="variant.price"
                />
            </div>
        </NuxtLink>

        <UForm
            :state="state"
            :schema="schema"
            :validate-on="['change']"
            class="flex flex-col gap-4"
        >
            <div class="flex flex-row gap-4 justify-between">
                <UFormField name="quantity">
                    <UInputNumber
                        v-model="state.quantity"
                        :min="1"
                        :max="10"
                        class="w-24"
                    />
                </UFormField>

                <AddToCart
                    v-if="variant"
                    :variant-id="variant.id"
                    :quantity="state.quantity"
                    :disabled="!variant.availableForSale"
                    :ui="{ trailingIcon: 'size-4' }"
                />
            </div>
        </UForm>
    </UCard>
</template>
