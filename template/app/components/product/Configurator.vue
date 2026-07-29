<script setup lang="ts">
import type { ProductFieldsFragment, ProductVariantFieldsFragment } from '#shopify/storefront'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  product?: ProductFieldsFragment
}>()

const selectedVariant = defineModel<ProductVariantFieldsFragment>()

const emit = defineEmits<{
  submit: [FormSubmitEvent<typeof state>]
}>()

const { add } = useCart()

const handle = computed(() => selectedVariant.value?.product.handle)

const state = reactive({
  quantity: 1,
  selectedOptions: selectedVariant.value?.selectedOptions,
})

const { data } = await useStorefrontData(localizedKey('product-options', handle), `#graphql
  query FetchProductOptions($handle: String, $language: LanguageCode, $country: CountryCode, $selectedOptions: [SelectedOptionInput!]) 
  @inContext(language: $language, country: $country) {
    product(handle: $handle) {
      options(first: 250) {
        ...ProductOptionFields
      }

      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions) {
        ...ProductVariantFields
      }
    }
  }
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
`, {
  variables: computed(() => productInputSchema.parse({
    handle: handle.value,
    selectedOptions: state.selectedOptions,
  })),
  transform: value => value.product,
  watch: [() => state.selectedOptions],
  cache: 'long',
  lazy: true,
})

const loading = ref(false)

const product = computed(() => data.value ?? props.product)

const soldOut = computed(() => Boolean(props.product && isSoldOut(props.product)))
const unavailable = computed(() => soldOut.value || !selectedVariant.value?.availableForSale)
const lowStock = computed(() => isLowStock(selectedVariant.value))
const subscription = computed(() => Boolean(props.product && hasSellingPlans(props.product)))

const maxQuantity = computed(() => {
  const quantity = selectedVariant.value?.quantityAvailable

  return quantity && quantity > 0 ? Math.min(quantity, 10) : 10
})

watch(() => data.value?.selectedOrFirstAvailableVariant, variant => selectedVariant.value = variant ?? undefined)

const onSubmit = async (event: FormSubmitEvent<typeof state>) => {
  if (!selectedVariant.value) return

  loading.value = true

  await add(selectedVariant.value.id, event.data.quantity).finally(() => {
    loading.value = false

    emit('submit', event)
  })
}
</script>

<template>
  <div>
    <div class="flex-col lg:flex pb-6 lg:pb-8">
      <h1 class="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
        {{ selectedVariant?.product?.title }}
      </h1>

      <ProductPrice
        v-if="selectedVariant"
        :price="selectedVariant.price"
        :compare-at-price="selectedVariant.compareAtPrice"
        class="inline-block lg:text-lg lg:mb-0"
        discount
      />

      <div class="flex flex-wrap items-center gap-2 mt-4">
        <UBadge
          v-if="unavailable"
          color="neutral"
          variant="subtle"
          :label="$t('product.soldOut')"
        />

        <UBadge
          v-else-if="lowStock"
          color="warning"
          variant="subtle"
          :label="$t('product.lowStock', { count: selectedVariant?.quantityAvailable ?? 0 })"
        />

        <UBadge
          v-if="subscription"
          color="primary"
          variant="subtle"
          :label="$t('product.subscription')"
        />

        <UBadge
          v-if="props.product?.isGiftCard"
          color="primary"
          variant="subtle"
          :label="$t('product.giftCard')"
        />
      </div>
    </div>

    <USeparator class="mb-6 lg:mb-8" />

    <UForm
      v-if="product"
      :state="state"
      @submit="onSubmit"
    >
      <ProductOptionGroup
        v-model="state.selectedOptions"
        :options="product.options"
        class="order-1 lg:order-2 mb-6 lg:mb-8"
      />

      <div class="flex justify-between items-center">
        <UFormField
          name="quantity"
          label="Quantity"
          class="-mt-1"
          :ui="{ label: 'hidden' }"
        >
          <UInputNumber
            v-model="state.quantity"
            :min="1"
            :max="maxQuantity"
            class="w-24 lg:w-28"
            size="xl"
          />
        </UFormField>

        <UButton
          type="submit"
          size="xl"
          variant="subtle"
          :disabled="!selectedVariant || unavailable || loading"
          :trailing-icon="loading ? 'i-lucide-loader-circle' : unavailable ? 'i-lucide-ban' : 'i-lucide-shopping-bag'"
          :ui="{ trailingIcon: loading ? 'animate-spin size-5' : 'size-5' }"
          :label="unavailable ? $t('product.soldOut') : $t('product.add')"
        />
      </div>
    </UForm>
  </div>
</template>
