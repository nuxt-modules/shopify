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

const getFilterComponent = (option: typeof props.options[number]) => {
    if (isColorSwatchOption(option)) return resolveComponent('ProductOptionSwatchColor')
    if (isImageSwatchOption(option)) return resolveComponent('ProductOptionSwatchImage')

    return resolveComponent('ProductOptionSwatchText')
}
</script>

<template>
    <div>
        <UFormField
            v-for="option in props.options.filter(option => option.optionValues.length > 1)"
            :key="option.id"
            :label="option.name"
            :name="option.name"
            class="mb-6 lg:mb-8"
        >
            <component
                :is="getFilterComponent(option)"
                v-model="state[option.name]"
                :option="option"
                @update:model-value="onChange"
            />
        </UFormField>
    </div>
</template>
