<script setup lang="ts">
const props = defineProps<{
    handle: string
}>()

const { country, language } = useLocalization()
const { add } = useCart()
const { t } = useI18n()

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
                class="lg:col-span-6"
            />

            <div class="flex flex-col gap-4 lg:col-span-4 lg:col-start-8">
                <div class="flex-col lg:flex lg:pb-4">
                    <h2 class="text-2xl">
                        {{ product.title }}
                    </h2>

                    <p>
                        {{ product.description }}
                    </p>
                </div>

                <USeparator class="mb-5" />

                <Price
                    v-if="state.selectedVariant"
                    :price="state.selectedVariant.price"
                />

                <div class="flex justify-between items-center">
                    <UFormField name="quantity">
                        <UInputNumber
                            v-model="state.quantity"
                            :min="1"
                            :max="10"
                            class="w-24 lg:w-28"
                            size="xl"
                        />
                    </UFormField>

                    <UButton
                        v-if="state.selectedVariant"
                        :label="t('product.addToCart')"
                        trailing-icon="i-lucide-shopping-cart"
                        size="xl"
                        :ui="{ trailingIcon: 'size-5' }"
                        :disabled="!state.selectedVariant.availableForSale"
                        @click="add(state.selectedVariant.id, state.quantity)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
