<script setup lang="ts">
const props = defineProps<{
  first?: number
}>()

const localePath = useLocalePath()

const first = computed(() => props.first ?? 10)

const { params: localization } = useLocalization()

const { data: collections } = await useStorefrontData(localizedKey('collections'), `#graphql
  query FetchCollections($first: Int, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    collections(
      first: $first
    ) {
      ...CollectionConnectionFields
    }
  }
`, {
  variables: computed(() => connectionParamsSchema.extend(localizationParamsSchema.shape).parse({
    first: first.value,
    ...localization.value,
  })),
  transform: data => flattenConnection(data?.collections),
  cache: 'long',
})
</script>

<template>
  <div class="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2 lg:grid-cols-3">
    <UPageCard
      v-for="(collection, index) in collections"
      :key="`collection-${index}`"
      class="mb-4"
      :title="collection.title"
      :description="collection.description"
      :to="localePath(`/collection/${collection.handle}`)"
      reverse
    >
      <NuxtImg
        v-if="collection.image"
        provider="shopify"
        :src="collection.image.url"
        :alt="collection.image.altText || collection.title"
        class="rounded-md object-cover aspect-square"
        sizes="xs:100vw sm:50vw lg:33vw xl:33vw"
        :width="600"
        :height="600"
      />
    </UPageCard>
  </div>
</template>
