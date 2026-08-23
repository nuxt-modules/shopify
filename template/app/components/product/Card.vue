<script setup lang="ts">
const props = defineProps<{
  product: ProductFieldsFragment
  carousel?: boolean
  loading?: 'eager' | 'lazy'
}>()

const localePath = useLocalePath()

const url = computed(() => localePath(`/product/${props.product.handle}`))
const images = computed(() => flattenConnection(props.product.images))
const variants = computed(() => flattenConnection(props.product.variants))

const variant = computed(() => props.product.selectedOrFirstAvailableVariant ?? variants.value[0])

const range = computed(() => hasPriceRange(props.product))
const price = computed(() => displayPrice(props.product, variant.value ?? undefined))
const compareAtPrice = computed(() => displayCompareAtPrice(props.product, variant.value ?? undefined))

const soldOut = computed(() => isSoldOut(props.product))
const discount = computed(() => discountPercentage(price.value, compareAtPrice.value))
</script>

<template>
  <UCard
    class="flex flex-col max-w-full h-full"
    variant="soft"
    :ui="{
      body: 'h-full !p-0',
      root: 'rounded-none !bg-transparent',
    }"
  >
    <div class="group relative rounded-md overflow-hidden mb-4">
      <div class="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
        <UBadge
          v-if="soldOut"
          color="neutral"
          variant="solid"
          :label="$t('product.soldOut')"
        />

        <UBadge
          v-else-if="discount"
          color="error"
          variant="solid"
          :label="$t('product.discount', { percentage: discount })"
        />

        <UBadge
          v-if="product.isGiftCard"
          color="primary"
          variant="solid"
          :label="$t('product.giftCard')"
        />
      </div>

      <UCarousel
        v-if="carousel && images.length > 1"
        v-slot="{ item, index }"
        :items="images"
        :ui="{
          prev: 'left-3! transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100',
          next: 'right-3! transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100',
        }"
        arrows
        loop
      >
        <NuxtLink
          :to="url"
          :aria-label="`${$t('product.view')}: '${props.product.title}'`"
        >
          <ProductImage
            :image="item"
            :loading="index === 0 ? props.loading : 'lazy'"
            :title="`${props.product.title}${index !== 0 ? ` (${index})` : ''}`"
          />
        </NuxtLink>
      </UCarousel>

      <NuxtLink
        v-else
        :to="url"
        :aria-label="`${$t('product.view')}: '${props.product.title}'`"
      >
        <ProductImage
          :image="images?.[0] ?? undefined"
          :loading="props.loading"
          :title="props.product.title"
        />

        <ProductImage
          v-if="images?.[1]"
          :image="images[1]"
          :title="`${props.product.title} (1)`"
          class="hidden absolute inset-0 bg-default group-hover:block"
        />
      </NuxtLink>
    </div>

    <div class="flex justify-end flex-wrap items-center relative">
      <NuxtLink
        :to="url"
        class="grow"
      >
        <p class="font-headings text-xl me-12">
          {{ props.product.title }}
        </p>

        <ProductPrice
          v-if="price"
          :price="price"
          :compare-at-price="compareAtPrice"
          :from="range"
          class="grow text-right"
        />
      </NuxtLink>

      <CartChoose
        v-if="variants.length > 1 && !soldOut"
        :product="props.product"
      />

      <CartAdd
        v-else
        :product="props.product"
      />
    </div>
  </UCard>
</template>
