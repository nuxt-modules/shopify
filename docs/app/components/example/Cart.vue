<script setup lang="ts">
const props = withDefaults(defineProps<{
  handle?: string
}>(), {
  handle: 'soft-cotton-hoodie-in-ocean',
})

const route = useRoute()
const router = useRouter()

const { data: product, refresh } = await useStorefrontData(`cart-product-${props.handle}`, `#graphql
  query GetCartPreviewProduct($handle: String!, $selectedOptions: [SelectedOptionInput!]) {
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
`, {
  variables: computed(() => ({
    handle: props.handle,
    selectedOptions: Object.entries(route.query).map(([name, value]) => ({ name, value: String(value) })),
  })),
  transform: data => data.product,
  watch: [() => route.query],
})

const { lines, quantity, total, checkoutUrl, loading, get, add, update, remove } = useCart()

const selectedQuantity = ref(1)
const open = ref(false)

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

const format = (amount: string | number, currencyCode: string) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: currencyCode,
}).format(Number(amount))

const addToCart = async () => {
  if (!variant.value) return

  await add(variant.value.id, selectedQuantity.value)

  open.value = true
}

onMounted(async () => {
  await get()

  if (!lines.value.length && variant.value) await add(variant.value.id)
  if (Object.keys(route.query).length) refresh()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <USlideover
        v-model:open="open"
        title="Cart"
        :description="`${quantity} item${quantity === 1 ? '' : 's'}`"
      >
        <div class="mb-2 flex w-full justify-center">
          <UButton
            icon="i-lucide-shopping-cart"
            color="neutral"
            variant="outline"
            size="lg"
          >
            View Cart ({{ quantity }})
          </UButton>
        </div>

        <template #body>
          <p
            v-if="!lines.length"
            class="text-muted"
          >
            Your cart is empty.
          </p>

          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="line in lines"
              :key="line.id"
              class="relative flex gap-4 py-4 first:pt-0"
            >
              <NuxtImg
                v-if="line.merchandise.image"
                :src="line.merchandise.image.url"
                :alt="line.merchandise.image.altText ?? line.merchandise.product.title"
                width="88"
                height="88"
                sizes="88px"
                class="size-22 shrink-0 rounded-sm object-cover"
              />

              <div class="flex flex-1 flex-col gap-2">
                <div>
                  <p class="font-semibold">
                    {{ line.merchandise.product.title }}
                  </p>

                  <p class="text-sm text-muted">
                    {{ line.merchandise.title }}
                  </p>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <UInputNumber
                    :model-value="line.quantity"
                    :min="0"
                    size="sm"
                    class="w-28"
                    :disabled="loading"
                    @update:model-value="update(line.id, Number($event))"
                  />

                  <span class="font-semibold">
                    {{ format(Number(line.cost.amountPerQuantity.amount) * line.quantity, line.cost.amountPerQuantity.currencyCode) }}
                  </span>
                </div>
              </div>

              <div class="absolute -right-1 top-0">
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove from cart"
                  :disabled="loading"
                  @click="remove(line.id)"
                />
              </div>
            </li>
          </ul>
        </template>

        <template #footer>
          <div class="flex w-full flex-col gap-3">
            <div
              v-if="total"
              class="flex items-center justify-between"
            >
              <span class="text-muted">Total</span>

              <span class="text-lg font-semibold">{{ format(total.amount, total.currencyCode) }}</span>
            </div>

            <UButton
              :to="checkoutUrl ?? undefined"
              external
              target="_blank"
              block
              size="lg"
              :disabled="!checkoutUrl || !lines.length"
            >
              Checkout
            </UButton>
          </div>
        </template>
      </USlideover>
    </div>

    <hr class="border-muted mb-4">

    <div class="grid gap-8 md:grid-cols-2 mb-2">
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

        <ProductVariantSelector
          v-if="product"
          v-model="selected"
          :options="product.options"
        />

        <div class="flex items-end gap-4 justify-between">
          <div>
            <p class="mb-2 text-sm font-semibold text-muted">
              Quantity
            </p>

            <UInputNumber
              v-model="selectedQuantity"
              :min="1"
              class="w-32"
            />
          </div>

          <UButton
            size="lg"
            :disabled="!variant?.availableForSale"
            @click="addToCart"
          >
            {{ variant?.availableForSale ? 'Add to Cart' : 'Unavailable' }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
