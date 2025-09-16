<script setup lang="ts">
const props = defineProps<{
    handle: string
}>()

const { country, language } = useLocalization()
const { add } = useCart()

const { data: product } = await useAsyncStorefront(`product-${props.handle}`, `#graphql
    query FetchProduct($handle: String, $language: LanguageCode, $country: CountryCode) 
    @inContext(language: $language, country: $country) {
        product(handle: $handle) {
            ...ProductFields
        }
    }
    ${IMAGE_FRAGMENT}
    ${PRICE_FRAGMENT}
    ${PRODUCT_FRAGMENT}
`, {
    variables: productInputSchema.parse({
        handle: props.handle,
        language: language.value,
        country: country.value,
    }),
}, {
    transform: data => data?.product,
})

const variants = computed(() => flattenConnection(product.value?.variants))

const defaultVariant = computed(() => {
    const availableVariant = variants.value.find(variant => variant.availableForSale)
    return availableVariant || variants.value[0] || null
})

const state = reactive({
    quantity: 1,
    selectedVariant: defaultVariant,
})
</script>

<template>
    <div>
        <div
            v-if="product"
            class="lg:grid lg:grid-cols-12 lg:pt-8"
        >
            <ProductImage
                :product="product"
                class="my-6 lg:mt-0 lg:col-span-6"
            />

            <div class="flex flex-col gap-4 lg:col-span-4 lg:col-start-8">
                <div class="flex-col gap-2 hidden lg:flex lg:pb-4">
                    <h2 class="text-2xl">
                        {{ product.title }}
                    </h2>

                    <ProductPrice
                        :product="product"
                        class="shrink"
                    />
                </div>

                <USeparator class="my-4 lg:my-8" />

                <div class="flex flex-col items-end gap-6">
                    <UFormField name="quantity">
                        <UInputNumber
                            v-model="state.quantity"
                            :min="1"
                            :max="10"
                            class="w-24 lg:w-28"
                            :ui="{
                                base: 'py-3 rounded-full',
                            }"
                        />
                    </UFormField>

                    <UButton
                        label="Add to Cart"
                        :disabled="!state.selectedVariant || !state.selectedVariant.availableForSale"
                        @click="state.selectedVariant ? add(state.selectedVariant.id, state.quantity) : null"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
