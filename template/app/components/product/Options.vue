<script setup lang="ts">
import type { FetchProductQuery, SelectedOption } from '#shopify/storefront'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
    product: NonNullable<FetchProductQuery['product']>
}>()

const emit = defineEmits<{
    choose: [SelectedOption]
    submit: [FormSubmitEvent<typeof state>]
}>()

const { add } = useCart()
const toast = useToast()

const options = computed(() => props.product.options)
const variants = computed(() => flattenConnection(props.product.variants))

const loading = ref(false)

const state = reactive({
    quantity: 1,
    options: props.product.selectedOrFirstAvailableVariant?.selectedOptions.reduce((acc, selectedOption) => {
        acc[selectedOption.name] = selectedOption.value

        return acc
    }, {} as Record<string, string>) ?? {},
})

const isColorSwatchOption = (option?: typeof options.value[number]) => {
    return !!option?.optionValues?.every(value => value.swatch?.color)
}

const isImageSwatchOption = (option?: typeof options.value[number]) => {
    return !!option?.optionValues?.every(value => value.swatch?.image?.previewImage?.url)
}

const onSubmit = async (event: FormSubmitEvent<typeof state>) => {
    const variant = variants.value.find(variant => variant.selectedOptions.every((selectedOption) => {
        const optionValue = event.data.options[selectedOption.name]

        return optionValue === selectedOption.value
    }))

    if (variant) {
        loading.value = true

        await add(variant.id, event.data.quantity).then(() => loading.value = false)

        emit('submit', event)
    }
    else {
        toast.add({
            title: 'Error',
            description: 'Please select valid options.',
        })
    }
}

watch(state, value => emit('choose', value.options), { deep: true })
</script>

<template>
    <UForm
        :state="state"
        @submit="onSubmit"
    >
        <div
            v-if="options.length > 0"
            class="mb-8 lg:mb-10"
        >
            <template
                v-for="option in options"
                :key="option.id"
            >
                <template v-if="option.optionValues.length > 1">
                    <ProductSwatchColor
                        v-if="isColorSwatchOption(option)"
                        v-model="state.options[option.name]"
                        :option="option"
                    />

                    <ProductSwatchImage
                        v-else-if="isImageSwatchOption(option)"
                        v-model="state.options[option.name]"
                        :option="option"
                    />

                    <UFormField
                        v-else
                        :label="option.name"
                        :name="option.name"
                        class="mb-6 lg:mb-8"
                    >
                        <URadioGroup
                            v-model="state.options[option.name]"
                            variant="card"
                            indicator="hidden"
                            :ui="{ fieldset: 'flex-row flex-wrap gap-2' }"
                            :items="option.optionValues.map(value => ({ label: value.name, value: value.name }))"
                        />
                    </UFormField>
                </template>
            </template>
        </div>

        <div class="flex justify-between items-center">
            <UFormField
                name="quantity"
                label="Quantity"
                class="-mt-1"
                :ui="{ label: 'hidden' }"
            >
                <UInputNumber
                    v-model="state.quantity"
                    :min="1"
                    :max="10"
                    class="w-24 lg:w-28"
                    size="xl"
                />
            </UFormField>

            <UButton
                v-bind="props"
                type="submit"
                size="xl"
                variant="subtle"
                :disabled="loading"
                :trailing-icon="loading ? 'i-lucide-loader-circle' : 'i-lucide-shopping-bag'"
                :ui="{ trailingIcon: loading ? 'size-5 animate-spin' : 'size-5' }"
                :label="$t('product.add')"
            />
        </div>
    </UForm>
</template>
