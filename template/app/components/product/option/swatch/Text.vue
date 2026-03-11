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
        :ui="{ fieldset: 'flex-row flex-wrap gap-2' }"
        :items="props.option.optionValues.map(value => ({ label: value.name, value: value.name }))"
    />
</template>
