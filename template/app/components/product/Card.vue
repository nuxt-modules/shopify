<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const { t } = useI18n()

const schema = z.object({
    quantity: z.number().min(1),
})

const state = reactive<z.infer<typeof schema>>({
    quantity: 1,
})
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
            <div class="relative flex flex-col gap-6 h-full">
                <NuxtLink
                    :to="getProductAppUrl(props.product.handle)"
                    class="flex flex-col grow"
                >
                    <ProductImage
                        :product="props.product"
                        class="pb-6"
                    />

                    <p class="text-xl font-bold pb-2 lg:text-lg">
                        {{ props.product.title }}
                    </p>

                    <ProductPrice
                        v-if="props.product"
                        :product="props.product"
                        class="lg:text-lg"
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

                        <UButton
                            :trailing-icon="icons.cartAdd"
                            :label="t('product.addToCart')"
                            variant="soft"
                            type="submit"
                            class="cursor-pointer"
                        />
                    </div>
                </UForm>
            </div>
        </UCard>
    </div>
</template>
