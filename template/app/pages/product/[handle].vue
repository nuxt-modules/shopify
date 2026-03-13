<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const { language, country } = useLocalization()
const localePath = useLocalePath()
const { locale } = useI18n()
const router = useRouter()
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
    cache: 'long',
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

const selectedVariant = ref(flattenConnection(data.value?.product?.variants)
    .find(variant => variant.id.replace('gid://shopify/ProductVariant/', '') === route.query.variantId)
    ?? product.value?.selectedOrFirstAvailableVariant)

useSeoMeta({
    title: `${product.value?.title} | ${shopName}`,
    description: product.value?.description ?? $t('seo.description'),
})

watch(selectedVariant, (variant) => {
    if (variant) {
        router.push({
            path: localePath(`/product/${variant.product.handle}`),
            query: { variantId: variant.id.replace('gid://shopify/ProductVariant/', '') },
        })
    }
})
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
            v-if="product && selectedVariant"
            class="mb-12 lg:grid lg:grid-cols-12 lg:mb-16"
        >
            <ProductGallery
                ref="carousel"
                :selected-variant="selectedVariant"
                :product="product"
                class="lg:col-span-6"
                thumbnails
            />

            <div class="lg:col-span-4 lg:col-start-8">
                <div class="lg:sticky lg:top-[calc(var(--ui-header-height)+3rem)]">
                    <ProductConfigurator
                        v-model="selectedVariant"
                        :product="product"
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
