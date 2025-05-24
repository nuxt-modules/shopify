<script setup lang="ts">
import type { ProductFilter, ProductConnectionFieldsFragment } from '#shopify/storefront'
import type { UpdateFilterFn } from '../../../types/filter'

const props = defineProps<{
    filter: ProductConnectionFieldsFragment['filters'][number]
}>()

const emits = defineEmits<UpdateFilterFn>()

const priceRange = computed(() => JSON.parse(props.filter.values?.[0]?.input ?? '') as Pick<ProductFilter, 'price'>)

const state = reactive(priceRange.value ?? { price: { min: 0, max: 0 } })

const update = () => {
    emits('update:filter', 'price', state as Pick<ProductFilter, 'price'>)
}
</script>

<template>
    <UFormField
        :label="props.filter.label"
        name="price"
    >
        <div class="flex items-center justify-between">
            <UFormField
                name="price.min"
                :label="$t('filters.price.min')"
                class="w-24"
            >
                <UInputNumber
                    v-model="state.price!.min"
                    :min="0"
                    :max="state.price!.max ?? undefined"
                    orientation="vertical"
                    class="w-24"
                    @change="update"
                />
            </UFormField>

            <UFormField
                name="price.max"
                :label="$t('filters.price.max')"
                class="w-24"
            >
                <UInputNumber
                    v-model="state.price!.max"
                    :min="state.price!.min ?? undefined"
                    orientation="vertical"
                    class="w-24"
                    @change="update"
                />
            </UFormField>
        </div>
    </UFormField>
</template>
