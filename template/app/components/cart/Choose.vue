<script setup lang="ts">
import type { SelectedOption, ValidProductSelectionResult } from '@shopify/hydrogen'

import { ProductProvider } from '~/utils/product-form'

const props = defineProps<{
  product: ProductFieldsFragment
}>()

const open = ref(false)
const selectedOptions = ref<SelectedOption[]>([])

const { params: localization } = useLocalization()

const { data, status, execute } = await useStorefrontData(localizedKey('product-form', () => props.product.handle, useId()), `#graphql
  query FetchProductForm($handle: String, $selectedOptions: [SelectedOptionInput!], $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    product(handle: $handle) {
      ...ProductFormFields
    }
  }
`, {
  variables: computed(() => productInputSchema.parse({
    handle: props.product.handle,
    selectedOptions: selectedOptions.value,
    ...localization.value,
  })),
  transform: data => data?.product,
  watch: [selectedOptions],
  cache: 'long',
  immediate: false,
})

const select = (result: ValidProductSelectionResult) => selectedOptions.value = result.selectedOptions

watch(open, () => {
  if (open.value && !data.value) execute()
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('product.options.title')"
    :description="$t('product.options.description')"
    :ui="{
      content: 'max-w-4xl!',
    }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      trailing-icon="i-lucide-shopping-bag"
      :label="$t('product.choose')"
      :aria-label="$t('product.choose')"
      :ui="{
        trailingIcon: 'size-5',
        label: [
          'ms-auto',
          'max-w-0',
          'invisible',
          'group-focus:visible',
          'group-focus:max-w-full',
          'group-hover:visible',
          'group-hover:max-w-full',
          'transition-all',
          'duration-300',
          'truncate-0',
          'ps-1.5',
          'pe-1',
        ],
        base: 'absolute bottom-0 group rounded-full p-2.5',
      }"
    />

    <template #body>
      <ProductProvider
        v-if="data"
        :product="data"
        :on-select="select"
      >
        <div class="lg:grid lg:grid-cols-12">
          <ProductGallery
            :product="data"
            class="lg:col-span-6"
          />

          <ProductConfigurator
            :product="data"
            :loading="status === 'pending'"
            class="lg:col-start-8 lg:col-span-5"
            @submit="open = false"
          />
        </div>
      </ProductProvider>
    </template>
  </UModal>
</template>
