<script setup lang="ts">
const open = useCartDrawer()
const localePath = useLocalePath()
const route = useRoute()

const totalQuantity = useCart(state => state.data.totalQuantity)
const hasLines = useCart(state => state.data.lines.nodes.length > 0)

const openDrawer = (event: MouseEvent) => {
  if (route.meta.cart) return

  event.preventDefault()

  open.value = true
}

onMounted(() => window.Shopify?.actions?.openCart?.configure({
  handler: async () => {
    open.value = true
  },
}))

watch(() => route.path, () => open.value = false)
</script>

<template>
  <div class="relative">
    <UButton
      :to="localePath('/cart')"
      icon="i-lucide-shopping-cart"
      variant="ghost"
      color="neutral"
      :label="$t('cart.open')"
      aria-haspopup="dialog"
      :ui="{
        label: 'sr-only',
        base: 'px-1.5 lg:px-2',
      }"
      @click="openDrawer"
    />

    <UBadge
      v-if="totalQuantity"
      class="absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2"
      size="xs"
    >
      {{ totalQuantity }}
    </UBadge>

    <USlideover
      v-model:open="open"
      :title="$t('cart.title')"
      :description="$t('cart.description')"
      :ui="{ description: 'sr-only', body: 'flex flex-col' }"
    >
      <template #body>
        <CartLines class="grow" />
      </template>

      <template #footer>
        <div
          v-if="hasLines"
          class="flex flex-col gap-6 w-full"
        >
          <CartDiscounts />

          <CartSummary />

          <UButton
            :to="localePath('/cart')"
            variant="link"
            color="neutral"
            class="self-center"
            :label="$t('cart.view')"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>
