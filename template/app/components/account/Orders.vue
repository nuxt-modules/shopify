<script setup lang="ts">
import type { OrderFieldsFragment } from '#shopify/customer-account'

defineProps<{
  orders: OrderFieldsFragment[]
}>()

const localePath = useLocalePath()
</script>

<template>
  <section>
    <h2 class="text-2xl lg:text-3xl text-gray-900 font-bold mb-6 lg:mb-8">
      {{ $t('account.orders.title') }}
    </h2>

    <div
      v-if="orders?.length"
      class="flex flex-col gap-4"
    >
      <AccountOrder
        v-for="order in orders"
        :key="order.id"
        :order="order"
      />
    </div>

    <div
      v-else
      class="flex flex-col items-center text-center gap-4 py-12"
    >
      <UIcon
        name="i-lucide-package-open"
        class="size-10 text-muted"
      />

      <p class="text-muted">
        {{ $t('account.orders.empty') }}
      </p>

      <UButton
        :to="localePath('/')"
        :label="$t('account.orders.browse')"
        trailing-icon="i-lucide-arrow-right"
      />
    </div>
  </section>
</template>
