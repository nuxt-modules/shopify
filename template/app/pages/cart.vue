<script setup lang="ts">
definePageMeta({
  cart: true,
})

const { shopify: { shopName } } = useAppConfig()

const lines = useCart(state => state.data.lines.nodes)

useSeoMeta({
  title: `${$t('cart.title')} | ${shopName}`,
  description: $t('cart.description'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: $t('cart.title') }]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-8 lg:mb-10">
      {{ $t('cart.title') }}
    </h1>

    <div class="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <CartLines class="lg:col-span-7" />

      <div
        v-if="lines.length"
        class="lg:col-span-5"
      >
        <UCard
          class="lg:sticky lg:top-[calc(var(--ui-header-height)+2rem)]"
          :ui="{ body: 'flex flex-col gap-8' }"
        >
          <CartDiscounts />

          <CartNote />

          <CartSummary />
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
