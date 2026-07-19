<script setup lang="ts">
import type { BadgeProps } from '#ui/types'
import type { OrderFieldsFragment } from '#shopify/customer-account'

const props = defineProps<{
  order: OrderFieldsFragment
}>()

const localePath = useLocalePath()
const { locale } = useI18n()

const to = computed(() => localePath(`/account/orders/${parseGid(props.order.id)}`))

const items = computed(() => flattenConnection(props.order.lineItems))

const date = computed(() => new Intl.DateTimeFormat(locale.value, {
  dateStyle: 'medium',
}).format(new Date(props.order.processedAt)))

const total = computed(() => new Intl.NumberFormat(locale.value, {
  style: 'currency',
  currency: props.order.totalPrice.currencyCode,
}).format(Number(props.order.totalPrice.amount)))

const status = computed(() => props.order.financialStatus)

const colors: Record<string, BadgeProps['color']> = {
  PAID: 'success',
  PENDING: 'warning',
  AUTHORIZED: 'warning',
  PARTIALLY_PAID: 'warning',
  PARTIALLY_REFUNDED: 'neutral',
  REFUNDED: 'neutral',
  VOIDED: 'error',
  EXPIRED: 'error',
}
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between' }">
    <div class="flex items-center gap-4">
      <div class="flex -space-x-3">
        <NuxtImg
          v-for="item in items"
          :key="item.id"
          provider="shopify"
          :src="item.image?.url"
          :alt="item.image?.altText ?? item.title ?? ''"
          width="96"
          height="96"
          class="size-12 rounded-md ring-2 ring-default bg-elevated object-cover"
        />
      </div>

      <div>
        <p class="font-medium">
          {{ order.name }}
        </p>

        <p class="text-sm text-muted">
          {{ date }} &middot; {{ $t('account.orders.items', { count: items.length }) }}
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 sm:justify-end">
      <UBadge
        v-if="status"
        :color="colors[status] ?? 'neutral'"
        variant="subtle"
        :label="$t(`account.orders.status.${status}`)"
      />

      <span class="font-bold">
        {{ total }}
      </span>

      <UButton
        :to="to"
        variant="ghost"
        color="neutral"
        :label="$t('account.orders.view')"
        trailing-icon="i-lucide-arrow-right"
        :ui="{ trailingIcon: 'size-4' }"
      />
    </div>
  </UCard>
</template>
