<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const { data, error } = await useStorefrontData(`product-${locale.value}-${handle.value}`, `#graphql
    query FetchProduct($handle: String, $language: LanguageCode, $country: CountryCode) 
    @inContext(language: $language, country: $country) {
        product(handle: $handle) {
            ...ProductFields
        }
        productRecommendations(productHandle: $handle) {
            ...ProductFields
        }
    }
    ${IMAGE_FRAGMENT}
    ${PRICE_FRAGMENT}
    ${PRODUCT_FRAGMENT}
`, {
    variables: computed(() => productInputSchema.parse({
        handle: handle.value,
        language: language.value,
        country: country.value,
    })),
})

const open = ref(false)

const variant = ref(props.product.selectedOrFirstAvailableVariant!)
</script>

<template>
    <UModal
        v-model:open="open"
        title="Choose Options"
        description="Select the options you want to add to your cart."
        :ui="{
            content: 'max-w-4xl!',
        }"
    >
        <UButton
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-shopping-bag"
            :label="$t('product.choose')"
            :ui="{
                trailingIcon: 'size-5',
                label: [
                    'ms-auto',
                    'max-w-0',
                    'invisible',
                    'group-focus:visible',
                    'group-focus:max-w-full',
                    'group-hover:visible',
                    'group-hover:max-w-full',
                    'transition-all',
                    'duration-300',
                    'truncate-0',
                    'ps-1.5',
                    'pe-1',
                ],
                base: 'absolute bottom-0 group rounded-full p-2.5',
            }"
        />

        <template #body>
            <div class="lg:grid lg:grid-cols-12">
                <ProductGallery
                    :product="props.product"
                    :selected-variant="variant ?? undefined"
                    class="lg:col-span-6"
                />

                <ProductConfigurator
                    v-model="variant"
                    class="lg:col-start-8 lg:col-span-5"
                />
            </div>
        </template>
    </UModal>
</template>
