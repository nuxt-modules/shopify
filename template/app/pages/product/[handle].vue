<script setup lang="ts">
import type { SelectedOption } from '#shopify/storefront'

definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { language, country } = useLocalization()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const carousel = useTemplateRef('carousel')

const handle = computed(() => route.params.handle as string)

const selectedOptions = ref<SelectedOption[]>()

const { data, error } = await useStorefrontData(`collection-${locale.value}-${handle.value}`, `#graphql
    query FetchProduct($handle: String, $language: LanguageCode, $country: CountryCode, $selectedOptions: [SelectedOptionInput!]) 
    @inContext(language: $language, country: $country) {
        product(handle: $handle) {
            ...ProductFields

            selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions) {
                ...ProductVariantFields
            }
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
        selectedOptions: Object.entries(selectedOptions.value ?? {}).map(([name, value]) => ({ name, value })),
    })),
    watch: [selectedOptions],
    deep: true,
})

if (error.value) {
    throw createError({
        statusCode: 404,
        message: error.value.message,
    })
}

const product = computed(() => data.value?.product)
const recommendations = computed(() => data.value?.productRecommendations)
const selectedVariant = computed(() => data.value?.product?.selectedOrFirstAvailableVariant)

const variants = computed(() => flattenConnection(product.value?.variants))
const images = computed(() => (selectedVariant.value?.image ? [selectedVariant.value.image] : [])
    .concat(flattenConnection(product.value?.images)))

useSeoMeta({
    title: `${product.value?.title} | Nuxt Shopify Demo Store`,
    description: product.value?.description,
})

watch(selectedVariant, () => carousel.value?.emblaApi?.scrollTo(0))
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
            class="lg:grid lg:grid-cols-12 mb-12 lg:mb-16"
        >
            <div class="lg:col-span-6">
                <UCarousel
                    v-if="images"
                    ref="carousel"
                    v-slot="{ item }"
                    :items="images"
                    :ui="{
                        prev: 'left-3!',
                        next: 'right-3!',
                    }"
                    class="mb-6 lg:mb-8"
                    arrows
                    loop
                >
                    <ProductImage :image="item" />
                </UCarousel>

                <div class="hidden lg:grid grid-cols-12 gap-8 mb-6 lg:mb-8">
                    <ProductImage
                        v-for="variant in variants"
                        :key="variant.id"
                        :image="variant.image ?? undefined"
                        class="col-span-6"
                    />
                </div>
            </div>

            <div class="flex flex-col gap-4 lg:col-span-4 lg:col-start-8">
                <div class="flex flex-col lg:sticky lg:top-[calc(var(--ui-header-height)+3rem)]">
                    <div class="flex-col lg:flex pb-6 lg:pb-8">
                        <h1 class="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                            {{ product.title }}
                        </h1>

                        <ProductPrice
                            v-if="selectedVariant"
                            :price="selectedVariant.price"
                            class="inline-block lg:text-lg lg:mb-0"
                        />
                    </div>

                    <USeparator class="mb-6 lg:mb-8" />

                    <p class="order-2 lg:order-1 lg:text-lg max-w-md mb-6 lg:mb-8">
                        {{ product.description }}
                    </p>

                    <ProductOptions
                        v-if="product.options.length > 0"
                        :product="product"
                        class="order-1 lg:order-2 mb-6 lg:mb-8"
                        @choose="options => selectedOptions = options"
                    />
                </div>
            </div>
        </div>

        <div v-if="recommendations">
            <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
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
