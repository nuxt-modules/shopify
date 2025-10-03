<script setup lang="ts">
const { language, country } = useLocalization()
const { locale } = useI18n()

const { data: collections } = await useStorefrontData(`collections-${locale.value}`, `#graphql
    query FetchCollections($first: Int, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
        collections(
            first: $first
        ) {
            ...CollectionConnectionFields
        }
    }
    ${IMAGE_FRAGMENT}
    ${COLLECTION_FRAGMENT}
    ${COLLECTION_CONNECTION_FRAGMENT}
`, {
    variables: connectionParamsSchema.extend(localizationParamsSchema.shape).parse({
        first: 10,
        language: language.value,
        country: country.value,
    }),
    transform: data => flattenConnection(data?.collections).filter(c => c.description),
})
</script>

<template>
    <div class="py-6 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2 lg:grid-cols-3">
        <UPageCard
            v-for="(collection, index) in collections"
            :key="`collection-${index}`"
            class="mb-4"
            :title="collection.title"
            :description="collection.description"
            :to="`/collection/${collection.handle}`"
            reverse
        >
            <NuxtImg
                v-if="collection.image"
                provider="shopify"
                :src="collection.image.url"
                :alt="collection.image.altText || collection.title"
                class="rounded-md"
                :width="600"
                :height="600"
            />
        </UPageCard>
    </div>
</template>
