<script setup lang="ts">
import type { CartLineFieldsFragment } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    line: CartLineFieldsFragment
}>()

const { update, remove } = useCart()

const variant = computed(() => props.line.merchandise)
const to = computed(() => `/product/${variant.value.product.handle}`)

const schema = z.object({
    quantity: z.number().min(1).max(10),
})

const state = reactive<z.infer<typeof schema>>({
    quantity: props.line.quantity,
})

watchDebounced(state, (state) => {
    update(props.line.id, state.quantity)
}, { debounce: 200 })
</script>

<template>
    <UCard :ui="{ body: 'relative flex justify-between gap-8' }">
        <NuxtLink :to="to">
            <NuxtImg
                provider="shopify"
                :src="variant.image?.url"
                :alt="variant.image?.altText ?? variant.product.title"
                width="160"
                height="160"
                class="size-24 lg:size-28"
            />
        </NuxtLink>

        <div class="h-24 flex flex-col justify-between grow lg:h-28">
            <NuxtLink
                :to="to"
                class="pt-2.5 font-medium"
            >
                {{ variant.product.title }} - {{ variant.title }}
            </NuxtLink>

            <div class="flex justify-between gap-4">
                <UForm
                    :state="state"
                    :schema="schema"
                    :validate-on="['change']"
                >
                    <UFormField name="quantity">
                        <UInputNumber
                            v-model="state.quantity"
                            :min="1"
                            :max="10"
                            class="w-24"
                        />
                    </UFormField>
                </UForm>

                <Price
                    :price="variant.price"
                    class="font-semibold leading-8"
                />
            </div>
        </div>

        <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            size="sm"
            class="absolute top-0 right-0 p-2 rounded-none rounded-bl-md"
            @click="remove(props.line.id)"
        />
    </UCard>
</template>
