<script setup lang="ts">
const props = defineProps<{
  price: PriceFieldsFragment
  compareAtPrice?: PriceFieldsFragment | null
  from?: boolean
  discount?: boolean
}>()

const { locale } = useI18n()

const format = (money?: PriceFieldsFragment | null) => {
  if (!money?.currencyCode) return ''

  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: money.currencyCode,
  }).format(Number(money.amount))
}

const price = computed(() => format(props.price))
const compareAtPrice = computed(() => format(props.compareAtPrice))

const discounted = computed(() => isDiscounted(props.price, props.compareAtPrice))
const percentage = computed(() => discountPercentage(props.price, props.compareAtPrice))
</script>

<template>
  <span class="inline-flex flex-wrap items-baseline gap-x-2">
    <span
      class="font-bold"
      :class="{ 'text-error': discounted }"
    >
      <template v-if="from">
        {{ $t('product.priceFrom', { price }) }}
      </template>

      <template v-else>
        {{ price }}
      </template>
    </span>

    <s
      v-if="discounted"
      class="text-sm text-muted font-normal"
    >
      {{ compareAtPrice }}
    </s>

    <UBadge
      v-if="discounted && discount"
      color="error"
      variant="subtle"
      size="sm"
      :label="$t('product.discount', { percentage })"
    />
  </span>
</template>
