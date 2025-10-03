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

const [{ data: page }, { data: collection }] = await Promise.all([
    useAsyncData(`page-${route.path}`, () => queryCollection('content').path(path.value).first()),

    useStorefrontData(`collection-${locale.value}-${handle.value}`, `#graphql
        query FetchCollection($handle: String, $language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
            collection(handle: $handle) {
                ...CollectionFields
            }
        }
        ${COLLECTION_FRAGMENT}
        ${IMAGE_FRAGMENT}
    `, {
        variables: z.object({
            handle: z.string(),
        }).extend(localizationParamsSchema.shape).parse({
            handle: handle.value,
            language: language.value,
            country: country.value,
        }),
        transform: data => data?.collection,
    }),
])

useSeoMeta({
    title: `${collection.value?.title} | Nuxt Shopify Demo Store`,
    description: collection.value?.description,
})
</script>

<template>
    <UContainer class="py-12">
        <ContentRenderer
            v-if="page"
            :value="page"
            :data="{ collection }"
            class="prose w-full max-w-none lg:prose-lg"
        />
    </UContainer>
</template>
