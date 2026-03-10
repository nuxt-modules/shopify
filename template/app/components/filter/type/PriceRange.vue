<script setup lang="ts">
import type { Filter, ProductFilter } from '#shopify/storefront'

import { z } from 'zod'

type FilterValue = { min?: number, max?: number }

const props = defineProps<{
    filter: Filter
}>()

const { get, set } = useFilters('price')
const { t } = useI18n()

const input = computed(() => JSON.parse(props.filter.values.at(0)?.input ?? '{}')?.price as FilterValue)

const componentToFilter = (value: FilterValue) =>
    [{ price: value } as ProductFilter]

const filterToComponent = (filter: ProductFilter[]) =>
    filter.map(f => f.price).filter(p => p !== undefined).at(0) as FilterValue ?? input.value

const schema = z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(1).optional(),
})

const state = reactive<z.infer<typeof schema>>(filterToComponent(get()) ?? {})

const submit = async (value: FilterValue) => set(componentToFilter(value))
</script>

<template>
    <UForm
        :state="state"
        :schema="schema"
        class="flex flex-col gap-4"
    >
        <div class="flex flex-row gap-4">
            <UFormField
                name="min"
                :label="t('price.from')"
            >
                <UInputNumber
                    v-model="state.min"
                    class="w-24"
                    :min="0"
                    :max="state.max"
                    @change="submit(state)"
                />
            </UFormField>

            <UFormField
                name="max"
                :label="t('price.to')"
            >
                <UInputNumber
                    v-model="state.max"
                    class="w-24"
                    :min="state.min"
                    @change="submit(state)"
                />
            </UFormField>
        </div>
    </UForm>
</template>
