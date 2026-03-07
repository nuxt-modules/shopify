<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { language, country } = useLocalization()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const { data: product } = await useStorefrontData(`collection-${locale.value}-${handle.value}`, `#graphql
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
        handle: handle.value,
        language: language.value,
        country: country.value,
    }),
    transform: data => data?.product,
})

useSeoMeta({
    title: `${product.value?.title} | Nuxt Shopify Demo Store`,
    description: product.value?.description,
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
    <UContainer class="py-12">
        <div
            v-if="product"
            class="lg:grid lg:grid-cols-12 lg:pt-8"
        >
            <ProductImage
                :image="product.featuredImage ?? undefined"
                class="lg:col-span-6 mb-6"
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

                    <AddToCart
                        v-if="state.selectedVariant"
                        :variant-id="state.selectedVariant.id"
                        :quantity="state.quantity"
                        :ui="{ trailingIcon: 'size-5' }"
                        :disabled="!state.selectedVariant.availableForSale"
                        size="xl"
                    />
                </div>
            </div>
        </div>
    </UContainer>
</template>
