<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const localePath = useLocalePath()

const url = computed(() => localePath(`/product/${props.product.handle}`))
const images = computed(() => flattenConnection(props.product.images))
const variants = computed(() => flattenConnection(props.product.variants))

const variant = ref(variants.value[0])

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
        <UCarousel
            v-if="images.length > 1"
            v-slot="{ item }"
            :items="images"
            class="w-full group mb-6"
            :ui="{
                prev: 'left-3! transition-opacity duration-150 opacity-0 group-hover:opacity-100',
                next: 'right-3! transition-opacity duration-150 opacity-0 group-hover:opacity-100',
            }"
            arrows
            loop
        >
            <NuxtLink :to="url">
                <ProductImage
                    :image="item"
                />
            </NuxtLink>
        </UCarousel>

        <NuxtLink
            v-else
            :to="url"
        >
            <ProductImage
                :image="variant?.image ?? undefined"
                class="mb-6"
            />
        </NuxtLink>

        <NuxtLink
            :to="url"
            class="flex justify-between flex-wrap items-center mb-6"
        >
            <p class="font-headings font-medium text-lg me-4">
                {{ props.product.title }}
            </p>

            <Price
                v-if="variant"
                :price="variant.price"
                class="grow text-right"
            />
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
