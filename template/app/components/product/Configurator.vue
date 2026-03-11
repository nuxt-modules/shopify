<script setup lang="ts">
import type { ProductFieldsFragment, ProductVariantFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const selectedVariant = defineModel<ProductVariantFieldsFragment>()

const state = reactive({
    selectedOptions: props.product.selectedOrFirstAvailableVariant?.selectedOptions || [],
    quantity: 1,
})

const onChange = () => selectedVariant.value = flattenConnection(props.product.variants)
    .find(variant => variant.selectedOptions.every(option =>
        state.selectedOptions.every(selectedOption =>
            selectedOption.name === option.name && selectedOption.value === option.value,
        ),
    ))
</script>

<template>
    <div>
        <div class="flex-col lg:flex pb-6 lg:pb-8">
            <h1 class="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                {{ props.product?.title }}
            </h1>

            <ProductPrice
                v-if="selectedVariant"
                :price="selectedVariant.price"
                class="inline-block lg:text-lg lg:mb-0"
            />
        </div>

        <USeparator class="mb-6 lg:mb-8" />

        <UForm>
            <ProductOptionGroup
                v-if="product?.options"
                v-model="state.selectedOptions"
                :options="product.options"
                class="order-1 lg:order-2 mb-6 lg:mb-8"
                @update:model-value="onChange"
            />

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
                    type="submit"
                    size="xl"
                    variant="subtle"
                    :trailing-icon="'i-lucide-shopping-bag'"
                    :ui="{ trailingIcon: 'size-5' }"
                    :label="$t('product.add')"
                />
            </div>
        </UForm>
    </div>
</template>
