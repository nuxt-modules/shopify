<script setup lang="ts">
const localePath = useLocalePath()

const cartState = useCart(state => state)
const lines = useCart(state => state.data.lines.nodes)
const loading = useCart(state => state.loading)
const errors = useCart(state => state.errors)

const orphanedLineErrors = computed(() => [...errors.value.lines]
  .filter(([id]) => !lines.value.some(line => line.id === id))
  .flatMap(([, group]) => group.userErrors))

const messages = computed(() => [
  ...errors.value.network,
  ...errors.value.cart.userErrors,
  ...orphanedLineErrors.value,
].map(error => error.message))

const dismissedAt = ref(0)

const showErrors = computed(() => messages.value.length > 0 && errors.value.lastUpdatedAt > dismissedAt.value)
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <UAlert
      v-if="showErrors"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('cart.error')"
      :description="messages.join(' ')"
      close
      @update:open="dismissedAt = errors.lastUpdatedAt"
    />

    <template v-if="loading">
      <USkeleton
        v-for="index in 2"
        :key="index"
        class="h-32 w-full"
      />
    </template>

    <CartLineItem
      v-for="line in lines"
      :key="line.id"
      :line="line"
      class="shrink-0"
    />

    <div
      v-if="!loading && lines.length === 0"
      class="flex flex-col items-center gap-4 my-auto py-8 text-center"
    >
      <p>{{ $t('cart.empty') }}</p>

      <UButton
        :to="localePath('/collections')"
        variant="soft"
        :label="$t('cart.continue')"
        trailing-icon="i-lucide-arrow-right"
      />
    </div>

    <ShopifyCartView :cart="cartState" />
  </div>
</template>
