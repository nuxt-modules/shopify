<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const url = getProductAppUrl(props.product.handle)

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
            <div class="relative flex flex-col h-full">
                <NuxtLink
                    :to="url"
                    class="flex flex-col grow"
                >
                    <ProductImage
                        :product="props.product"
                        class="mb-6"
                    />

                    <p class="text-sm font-headings font-extralight pb-2 lg:text-lg">
                        {{ props.product.title }}
                    </p>
                </NuxtLink>

                <NuxtLink
                    :to="url"
                    class="mt-2 mb-3 md:mb-5"
                >
                    <ProductPrice
                        v-if="props.product"
                        :product="props.product"
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

                        <ProductAddToCart
                            v-if="props.product"
                            :product="props.product"
                            :quantity="state.quantity"
                            :ui="{
                                price: 'hidden',
                            }"
                            trailing-icon
                        />
                    </div>
                </UForm>
            </div>
        </UCard>
    </div>
</template>
