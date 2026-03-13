<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const key = computed(() => `collection-${locale.value}-${handle.value}`)

const { data: collection, error } = await useStorefrontData(key, `#graphql
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
    variables: computed(() => collectionInputSchema.parse({
        handle: handle.value,
    })),
    transform: data => data?.collection,
    cache: 'long',
})

if (!collection.value || error.value) {
    throw createError({
        status: 404,
        statusText: `${$t('error.notFound')}: ${route.fullPath}`,
        message: error.value?.message || $t('error.collection'),
        fatal: true,
    })
}

useSeoMeta({
    title: `${collection.value?.title} | ${shopName}`,
    description: collection.value?.description ?? $t('seo.description'),
})
</script>

<template>
    <UContainer class="py-6 lg:py-8">
        <UBreadcrumb
            :items="[
                { label: 'Collections' },
                { label: collection?.title, to: localePath(`/collection/${handle}`) },
            ]"
            class="mb-6 lg:mb-8"
        />

        <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
            {{ collection?.title }}
        </h1>

        <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
            {{ collection?.description }}
        </p>

        <CollectionProducts :handle="handle" />
    </UContainer>
</template>
