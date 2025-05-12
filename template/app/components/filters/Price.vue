<script setup lang="ts">
import type { ProductFilter, FilterFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filter: FilterFieldsFragment
}>()

const priceRange = computed(() => JSON.parse(props.filter.values?.[0]?.input as string ?? '') as Pick<ProductFilter, 'price'>)

const value = ref([priceRange.value.price?.min ?? 0, priceRange.value.price?.max ?? 0])
</script>

<template>
    <UFormField
        :label="props.filter.label"
        name="price"
    >
        <div class="flex items-center justify-between">
            <span>{{ value[0] }}</span>
            <span>{{ value[1] }}</span>
        </div>

        <USlider
            v-model="value"
            :min="priceRange.price?.min ?? 0"
            :max="priceRange.price?.max ?? 0"
            :step="1"
            class="pt-2"
            tooltip
        />
    </UFormField>
</template>
