<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const localePath = useLocalePath()

const url = localePath(`/product/${props.product.handle}`)

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
        <div class="relative flex flex-col h-full">
            <NuxtLink
                :to="url"
                class="flex flex-col grow"
            >
                <ProductImage
                    :product="props.product"
                    class="not-prose mb-6"
                />

                <p class="text-sm font-headings font-extralight pb-2 lg:text-lg">
                    {{ props.product.title }}
                </p>
            </NuxtLink>

            <NuxtLink
                :to="url"
                class="pt-2 pb-3 md:pb-5"
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

                    <UButton
                        trailing-icon="i-lucide-shopping-cart"
                        label="add to cart"
                    />
                </div>
            </UForm>
        </div>
    </UCard>
</template>
