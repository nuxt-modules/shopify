<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { country, language, key: translationKey } = useTranslation()
const storefront = useStorefront()
const route = useRoute()

const handle = route.params.handle as string

const key = computed(() => [
    'collection',
    handle,
    translationKey.value,
].join('-'))

const { data: collection } = await useAsyncData(key, async () => await storefront.request(`#graphql
    query FetchCollection(
        $handle: String,
        $language: LanguageCode,
        $country: CountryCode
    )
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
    }).merge(localizationParamsSchema).parse({
        handle,
        language: language.value,
        country: country.value,
    }),
}), {
    transform: response => response.data?.collection,
})
</script>

<template>
    <div>
        <h1 class="text-2xl">
            {{ collection?.title }}
        </h1>

        <ProductListing
            :handle="handle"
        />
    </div>
</template>
