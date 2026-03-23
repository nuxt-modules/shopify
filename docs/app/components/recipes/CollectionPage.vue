<script setup lang="ts">
const props = defineProps<{
  handle: string
}>()

const router = useRouter()
const route = useRoute()

const key = `collection-${props.handle}`

const { data: collection, refresh } = await useStorefrontData(key, `#graphql
    query GetCollection(
        $handle: String!, 
        $first: Int, 
        $last: Int, 
        $after: String, 
        $before: String, 
        $language: LanguageCode, 
        $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
        collection(handle: $handle) {
            ...CollectionFields

            products(first: $first, last: $last, after: $after, before: $before) {
                ...ProductConnectionFields
            }
        }
    }
    ${COLLECTION_FRAGMENT}
    ${PRODUCT_CONNECTION_FRAGMENT}
`, {
  variables: computed(() => ({
    handle: props.handle,
    language: 'EN',
    country: 'US',
    first: route.query.before ? undefined : 4,
    last: route.query.before ? 4 : undefined,
    after: route.query.after,
    before: route.query.before,
  })),
  transform: data => data.collection,
})

const products = computed(() => flattenConnection(collection.value?.products))

const startCursor = computed(() => collection.value?.products.pageInfo.startCursor)
const endCursor = computed(() => collection.value?.products.pageInfo.endCursor)
const hasPreviousPage = computed(() => collection.value?.products.pageInfo.hasPreviousPage)
const hasNextPage = computed(() => collection.value?.products.pageInfo.hasNextPage)

const pushToQuery = async (query: Record<string, string | undefined | null>) => {
  await router.push({ query }).then(async () => await refresh())
}
</script>

<template>
  <div>
    <p class="mb-4 text-2xl font-bold">
      {{ collection?.title }}
    </p>

    <p class="mb-6">
      {{ collection?.description }}
    </p>

    <div class="grid gap-4 grid-cols-1 sm:gap-8 md:grid-cols-2">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>

    <div class="flex justify-between mt-8">
      <UButton
        v-if="hasPreviousPage"
        icon="i-lucide-arrow-left"
        @click="pushToQuery({ before: startCursor })"
      >
        Previous
      </UButton>

      <UButton
        v-if="hasNextPage"
        trailing-icon="i-lucide-arrow-right"
        @click="pushToQuery({ after: endCursor })"
      >
        Next
      </UButton>
    </div>
  </div>
</template>
