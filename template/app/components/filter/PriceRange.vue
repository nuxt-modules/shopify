<script setup lang="ts">
import type { ProductFilterFieldsFragment, ProductFilter } from '#shopify/storefront'

import { z } from 'zod'

const props = defineProps<{
    filter: ProductFilterFieldsFragment['filters'][number]
}>()

const { get, set } = useFilter('price')
const { t } = useI18n()

const input = computed(() => JSON.parse(props.filter.values.at(0)?.input ?? '{}')?.price as ProductFilter['price'])
const query = computed(() => get().at(0) as ProductFilter['price'])

const schema = z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(1).optional(),
})

const state = reactive<z.infer<typeof schema>>({
    min: query.value?.min ?? input.value?.min ?? 0,
    max: query.value?.max ?? input.value?.max ?? 1,
})

const submit = async (values: { min?: number, max?: number }) => set([{ price: values }])
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
                    @change="async () => submit(state)"
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
                    @change="async () => submit(state)"
                />
            </UFormField>
        </div>
    </UForm>
</template>
