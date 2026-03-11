<script setup lang="ts">
import type { ProductOptionFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    option: ProductOptionFieldsFragment
}>()

const state = defineModel<string>()
</script>

<template>
    <URadioGroup
        v-model="state"
        variant="card"
        indicator="hidden"
        :ui="{
            fieldset: 'flex-row flex-wrap gap-2',
            item: 'overflow-hidden rounded-full p-0.5',
        }"
        :items="props.option.optionValues.map(value => ({ label: value.name, value: value.name }))"
    >
        <template #label="{ item }">
            <span
                class="block w-8 h-8 rounded-full"
                :style="{
                    background: props.option.optionValues.find(value => value.name === item.value)?.swatch?.color ?? undefined,
                }"
            />
        </template>
    </URadioGroup>
</template>
