<script setup lang="ts">
const props = defineProps<{
  handle: string
}>()

const route = useRoute()
const router = useRouter()

const quantity = ref(1)

const { data: product, refresh } = await useStorefrontData(`product-${props.handle}`, `#graphql
  query GetProductDetails($handle: String!, $selectedOptions: [SelectedOptionInput!]) {
    product(handle: $handle) {
      id
      title
      description
      featuredImage {
        ...ImageFields
      }
      options {
        ...ProductOptionFields
      }
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions) {
        ...ProductVariantFields
      }
    }
  }
  ${OPTION_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${IMAGE_FRAGMENT}
`, {
  variables: computed(() => ({
    handle: props.handle,
    selectedOptions: Object.entries(route.query).map(([name, value]) => ({ name, value: String(value) })),
  })),
  transform: data => data.product,
  watch: [() => route.query],
})

const variant = computed(() => product.value?.selectedOrFirstAvailableVariant)

const selected = computed<Record<string, string>>({
  get: () => Object.keys(route.query).length
    ? { ...route.query } as Record<string, string>
    : Object.fromEntries(variant.value?.selectedOptions.map(option => [option.name, option.value]) ?? []),
  set: options => router.push({ query: options }),
})

const image = computed(() => variant.value?.image ?? product.value?.featuredImage)

const price = computed(() => {
  if (!variant.value) return ''

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: variant.value.price.currencyCode,
  }).format(Number(variant.value.price.amount))
})

onMounted(() => {
  if (Object.keys(route.query).length) refresh()
})
</script>

<template>
  <div class="grid gap-8 md:grid-cols-2">
    <NuxtImg
      v-if="image"
      :src="image.url"
      :alt="image.altText ?? undefined"
      :width="image.width ?? undefined"
      :height="image.height ?? undefined"
      sizes="xs:100vw sm:50vw md:33vw"
      class="rounded-md"
    />

    <div class="space-y-6">
      <div>
        <p class="text-2xl font-bold">
          {{ product?.title }}
        </p>

        <p class="text-xl">
          {{ price }}
        </p>
      </div>

      <p class="text-muted">
        {{ product?.description }}
      </p>

      <VariantSelector
        v-if="product"
        v-model="selected"
        :options="product.options"
      />

      <div class="flex items-end gap-4">
        <div>
          <p class="mb-2 text-sm font-semibold text-muted">
            Quantity
          </p>

          <UInputNumber
            v-model="quantity"
            :min="1"
            class="w-32"
          />
        </div>

        <UButton
          size="lg"
          :disabled="!variant?.availableForSale"
        >
          {{ variant?.availableForSale ? 'Add to Cart' : 'Unavailable' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
