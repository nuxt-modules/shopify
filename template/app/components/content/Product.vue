<script setup lang="ts">
const props = defineProps<{
    handle: string
}>()

const { country, language } = useLocalization()
const storefront = useStorefront()

const { data: product } = await useAsyncData(() => storefront.request(`#graphql
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
}), {
    transform: response => response.data?.product,
})

const state = reactive({
    quantity: 1,
})
</script>

<template>
    <div>
        <div class="lg:grid lg:grid-cols-12 lg:pt-8">
            <ProductImage
                :product="product ?? undefined"
                class="my-6 lg:mt-0 lg:col-span-6"
            />

            <div class="flex flex-col gap-4 lg:col-span-4 lg:col-start-8">
                <div class="flex-col gap-2 hidden lg:flex lg:pb-4">
                    <h2 class="text-2xl">
                        {{ product?.title }}
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
                </div>
            </div>
        </div>
    </div>
</template>
