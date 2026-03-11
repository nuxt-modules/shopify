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
            item: 'p-0 overflow-hidden',
        }"
        :items="props.option.optionValues.map(value => ({ label: value.name, value: value.name }))"
    >
        <template #label="{ item }">
            <NuxtImg
                :src="props.option.optionValues.find(value => value.name === item.value)?.swatch?.image?.previewImage?.url ?? undefined"
                :alt="item.label"
                width="50"
                height="50"
            />
        </template>
    </URadioGroup>
</template>
