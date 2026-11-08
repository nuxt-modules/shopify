<script setup lang="ts">
const cost = useCart(state => state.data.cost)
const checkoutUrl = useCart(state => state.data.checkoutUrl)
const pending = useCart(state => state.pending.cost === true || state.revalidating)
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <dl
      class="flex flex-col gap-2 transition-opacity"
      :class="{ 'opacity-50': pending }"
      :aria-busy="pending"
    >
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          {{ $t('cart.subtotal') }}
        </dt>

        <dd>
          <ProductPrice :price="cost.subtotalAmount" />
        </dd>
      </div>

      <div class="flex justify-between gap-4 font-semibold text-lg">
        <dt>{{ $t('cart.total') }}</dt>

        <dd>
          <ProductPrice :price="cost.totalAmount" />
        </dd>
      </div>
    </dl>

    <p class="text-sm text-muted">
      {{ $t('cart.taxes') }}
    </p>

    <UButton
      :to="checkoutUrl ?? undefined"
      :label="$t('cart.checkout')"
      size="xl"
      class="justify-center"
      trailing-icon="i-lucide-arrow-right"
      :ui="{
        trailingIcon: 'size-4',
      }"
      :disabled="pending || !checkoutUrl"
    />
  </div>
</template>
