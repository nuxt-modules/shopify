<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { z } from 'zod'

import { UFormField, USlider } from '#components'

const schema = z.object({
    searchTerm: z.string(),
    priceRange: z.array(z.number()).min(2).max(2),
    sale: z.boolean(),
    new: z.boolean(),
    popular: z.boolean(),
    pagination: z.object({
        first: z.number().min(1).max(100),
        last: z.number().min(1).max(100),
    }),
})

export type FilterState = z.infer<typeof schema>

const state = reactive<FilterState>({
    searchTerm: '',
    priceRange: [0, 500],
    sale: false,
    new: false,
    popular: false,
    pagination: {
        first: 1,
        last: 10,
    },
})

const emit = defineEmits<{
    (e: 'change', state: FilterState): void
}>()

const price = computed(() => `${state.priceRange[0]} - ${state.priceRange[1]}`)

watchDebounced(state, async () => {
    await schema.safeParseAsync(state)
        .then((result) => {
            if (result.success) {
                emit('change', state)
            }
        })
}, { deep: true, debounce: 500 })
</script>

<template>
    <div class="flex flex-col gap-4">
        <UForm
            :state="state"
            :schema="schema"
            :validate-on="['change']"
            class="gap-4 flex flex-col"
        >
            <h2 class="text-xl font-bold">
                Filters
            </h2>

            <p>
                Quickly find the perfect vintage piece that suits you
            </p>

            <USeparator label="Price" />

            <div class="flex flex-col gap-2">
                <UFormField
                    :label="price"
                    name="price"
                >
                    <USlider
                        v-model="state.priceRange"
                        :step="10"
                        :min="0"
                        :max="1000"
                    />
                </UFormField>
            </div>

            <USeparator label="Product Type" />

            <div class="flex flex-col gap-2">
                <UFormField name="sale">
                    <UCheckbox
                        v-model="state.sale"
                        name="sale"
                        label="Sale"
                    />
                </UFormField>

                <UFormField name="new">
                    <UCheckbox
                        v-model="state.new"
                        name="new"
                        label="New"
                    />
                </UFormField>

                <UFormField name="popular">
                    <UCheckbox
                        v-model="state.popular"
                        name="popular"
                        label="Popular"
                    />
                </UFormField>
            </div>
        </UForm>
    </div>
</template>
