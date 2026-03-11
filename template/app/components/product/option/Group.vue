<script setup lang="ts">
import type { ProductOptionFieldsFragment, SelectedOption } from '#shopify/storefront'

const props = defineProps<{
    options: ProductOptionFieldsFragment[]
}>()

const selectedOptions = defineModel<SelectedOption[]>()

const optionsToState = (options?: SelectedOption[]) => options?.reduce((acc, option) => {
    acc[option.name] = option.value

    return acc
}, {} as Record<string, string>) ?? {}

const stateToOptions = (state: Record<string, string>) =>
    Object.entries(state).map(([name, value]) => ({ name, value }))

const state = reactive(optionsToState(selectedOptions.value))

const onChange = () => selectedOptions.value = stateToOptions(state)

const isColorSwatchOption = (option?: typeof props.options[number]) =>
    !!option?.optionValues?.every(value => value.swatch?.color)

const isImageSwatchOption = (option?: typeof props.options[number]) =>
    !!option?.optionValues?.every(value => value.swatch?.image?.previewImage?.url)
</script>

<template>
    <div
        v-for="option in props.options"
        :key="option.id"
    >
        <UFormField
            v-if="option.optionValues.length > 1"
            :label="option.name"
            :name="option.name"
            class="mb-6 lg:mb-8"
        >
            <ProductOptionSwatchColor
                v-if="isColorSwatchOption(option)"
                v-model="state[option.name]"
                :option="option"
                @update:model-value="onChange"
            />

            <ProductOptionSwatchImage
                v-else-if="isImageSwatchOption(option)"
                v-model="state[option.name]"
                :option="option"
                @update:model-value="onChange"
            />

            <ProductOptionSwatchText
                v-else
                v-model="state[option.name]"
                :option="option"
                @update:model-value="onChange"
            />
        </UFormField>
    </div>
</template>
