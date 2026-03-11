<script setup lang="ts">
import type { SelectedOption } from '#shopify/storefront'

definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { language, country } = useLocalization()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

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

if (!data.value?.product || error.value) {
    throw createError({
        status: 404,
        statusText: `${$t('error.notFound')}: ${route.fullPath}`,
        message: error.value?.message || $t('error.product'),
    })
}

const product = computed(() => data.value?.product)
const recommendations = computed(() => data.value?.productRecommendations)

const selectedOptions = ref<SelectedOption[]>([])

const selectedVariant = computed(() => flattenConnection(data.value?.product?.variants)
    .find(variant => variant.id.replace('gid://shopify/ProductVariant/', '') === route.query.variantId)
    ?? product.value?.selectedOrFirstAvailableVariant)

useSeoMeta({
    title: `${product.value?.title} | Nuxt Shopify Demo Store`,
    description: product.value?.description,
})

watch(selectedOptions, value => console.log(value))
</script>

<template>
    <UContainer class="py-6 pb-12 lg:py-8 lg:pb-16">
        <UBreadcrumb
            :items="[
                { label: 'Products' },
                { label: product?.title, to: localePath(`/product/${handle}`) },
            ]"
            class="mb-6 lg:mb-8"
        />

        <div
            v-if="product"
            class="mb-12 lg:grid lg:grid-cols-12 lg:mb-16"
        >
            <ProductGallery
                ref="carousel"
                :product="product"
                :selected-variant="selectedVariant ?? undefined"
                class="lg:col-span-6"
                thumbnails
            />

            <div class="lg:col-span-4 lg:col-start-8">
                <div class="lg:sticky lg:top-[calc(var(--ui-header-height)+3rem)]">
                    <ProductConfigurator
                        :handle="handle"
                        class="mb-12 lg:mb-16"
                    />

                    <p class="mb-6 lg:text-lg lg:mb-8">
                        {{ product.description }}
                    </p>
                </div>
            </div>
        </div>

        <div v-if="recommendations">
            <h2 class="text-3xl text-gray-900 font-bold mb-6 lg:mb-8 lg:text-4xl">
                {{ $t('product.recommendations') }}
            </h2>

            <div class="mb-12 sm:px-12 lg:mb-16">
                <UCarousel
                    v-slot="{ item }"
                    :items="recommendations"
                    :ui="{ item: 'md:basis-1/2 lg:basis-1/3' }"
                    class="w-full mb-6"
                    arrows
                    loop
                >
                    <ProductCard :product="item" />
                </UCarousel>
            </div>
        </div>
    </UContainer>
</template>
