<script setup lang="ts">
import { joinURL } from 'ufo'
import { z } from 'zod'

definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { language, country } = useLocalization()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)
const path = computed(() => (route.path.includes(locale.value) ? route.path : `/${joinURL(locale.value, route.path)}`).replace(handle.value, ''))

const [{ data: page }, { data: product }] = await Promise.all([
    useAsyncData(`page-${route.path}`, () => queryCollection('content').path(path.value).first()),

    useStorefrontData(`collection-${locale.value}-${handle.value}`, `#graphql
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
        variables: z.object({
            handle: z.string(),
        }).extend(localizationParamsSchema.shape).parse({
            handle: handle.value,
            language: language.value,
            country: country.value,
        }),
        transform: data => data?.product,
    }),
])

useSeoMeta({
    title: `${product.value?.title} | Nuxt Shopify Demo Store`,
    description: product.value?.description,
})
</script>

<template>
    <UContainer class="py-12">
        <ContentRenderer
            v-if="page"
            :value="page"
            :data="{ product }"
            class="prose w-full max-w-none lg:prose-lg"
        />
    </UContainer>
</template>
