<script setup lang="ts">
import type { BadgeProps } from '#ui/types'
import type { MoneyV2 } from '#shopify/customer-account'

definePageMeta({
  validate: route => typeof route.params.id === 'string' && route.params.id.length > 0,
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const id = computed(() => route.params.id as string)

const key = computed(() => `account-order-${id.value}`)

const { data: order, error } = await useCustomerAccountData(key, `#graphql
  query FetchAccountOrder($id: ID!) {
    order(id: $id) {
      ...OrderDetailsFields
    }
  }
  ${ADDRESS_FRAGMENT}
  ${ORDER_DETAILS_FRAGMENT}
`, {
  variables: computed(() => customerOrderInputSchema.parse({
    id: id.value,
  })),
  transform: data => data?.order,
})

if (!order.value || error.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: error.value?.message || $t('account.orders.notFound'),
    fatal: true,
  })
}

const items = computed(() => flattenConnection(order.value?.lineItems))

const date = computed(() => order.value
  ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(order.value.processedAt))
  : '')

const money = (value?: MoneyV2 | null) => value
  ? new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: value.currencyCode,
    }).format(Number(value.amount))
  : undefined

const totals = computed(() => [
  { label: $t('account.orders.detail.subtotal'), value: money(order.value?.subtotal) },
  { label: $t('account.orders.detail.shipping'), value: money(order.value?.totalShipping) },
  { label: $t('account.orders.detail.tax'), value: money(order.value?.totalTax) },
].filter(row => row.value))

const addresses = computed(() => [
  { label: $t('account.orders.detail.shippingAddress'), value: order.value?.shippingAddress?.formatted },
  { label: $t('account.orders.detail.billingAddress'), value: order.value?.billingAddress?.formatted },
].filter(entry => entry.value?.length))

const financialColors: Record<string, BadgeProps['color']> = {
  PAID: 'success',
  PENDING: 'warning',
  AUTHORIZED: 'warning',
  PARTIALLY_PAID: 'warning',
  PARTIALLY_REFUNDED: 'neutral',
  REFUNDED: 'neutral',
  VOIDED: 'error',
  EXPIRED: 'error',
}

const fulfillmentColors: Record<string, BadgeProps['color']> = {
  FULFILLED: 'success',
  READY_FOR_DELIVERY: 'success',
  READY_FOR_PICKUP: 'success',
  IN_PROGRESS: 'warning',
  PARTIALLY_FULFILLED: 'warning',
  SCHEDULED: 'warning',
  PENDING_FULFILLMENT: 'warning',
  ON_HOLD: 'warning',
  OPEN: 'neutral',
  UNFULFILLED: 'neutral',
  RESTOCKED: 'neutral',
}

useSeoMeta({
  title: `${order.value?.name} | ${shopName}`,
  description: $t('account.description'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('account.label'), to: localePath('/account') },
        { label: $t('account.orders.title'), to: localePath('/account/orders') },
        { label: order?.name },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div class="flex flex-wrap items-start justify-between gap-4 mb-8 lg:mb-10">
      <div>
        <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-3">
          {{ order?.name }}
        </h1>

        <p class="text-muted mb-3">
          {{ $t('account.orders.detail.placed', { date }) }}
        </p>

        <div class="flex items-center gap-2">
          <UBadge
            v-if="order?.financialStatus"
            :color="financialColors[order.financialStatus] ?? 'neutral'"
            variant="subtle"
            :label="$t(`account.orders.status.${order.financialStatus}`)"
          />

          <UBadge
            v-if="order?.fulfillmentStatus"
            :color="fulfillmentColors[order.fulfillmentStatus] ?? 'neutral'"
            variant="subtle"
            :label="$t(`account.orders.fulfillment.${order.fulfillmentStatus}`)"
          />
        </div>
      </div>

      <div class="flex flex-wrap">
        <UButton
          v-if="order?.statusPageUrl"
          :to="order.statusPageUrl"
          target="_blank"
          variant="outline"
          color="neutral"
          :label="$t('account.orders.detail.manage')"
          trailing-icon="i-lucide-arrow-up-right"
          :ui="{ trailingIcon: 'size-4' }"
          class="ms-auto"
        />
      </div>
    </div>

    <div class="grid gap-8 lg:grid-cols-3 lg:gap-10">
      <section class="lg:col-span-2">
        <h2 class="text-2xl lg:text-3xl text-gray-900 font-bold mb-6">
          {{ $t('account.orders.detail.items') }}
        </h2>

        <UCard :ui="{ body: 'divide-y divide-default' }">
          <div
            v-for="item in items"
            :key="item.id"
            class="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
          >
            <NuxtImg
              provider="shopify"
              :src="item.image?.url"
              :alt="item.image?.altText ?? item.title ?? ''"
              width="128"
              height="128"
              class="size-16 rounded-md bg-elevated object-cover shrink-0"
            />

            <div class="min-w-0 grow">
              <p class="font-medium wrap-break-word">
                {{ item.title }}
              </p>

              <p
                v-if="item.variantTitle"
                class="text-sm text-muted"
              >
                {{ item.variantTitle }}
              </p>

              <p class="text-sm text-muted">
                {{ $t('account.orders.detail.quantity', { count: item.quantity }) }}
              </p>
            </div>

            <span class="font-medium whitespace-nowrap">
              {{ money(item.totalPrice) }}
            </span>
          </div>
        </UCard>
      </section>

      <div class="flex flex-col gap-8">
        <section>
          <h2 class="text-2xl lg:text-3xl text-gray-900 font-bold mb-6">
            {{ $t('account.orders.detail.summary') }}
          </h2>

          <UCard :ui="{ body: 'flex flex-col gap-3' }">
            <div
              v-for="row in totals"
              :key="row.label"
              class="flex justify-between gap-4 text-sm"
            >
              <span class="text-muted">{{ row.label }}</span>
              <span>{{ row.value }}</span>
            </div>

            <div class="flex justify-between gap-4 border-t border-default pt-3 font-bold">
              <span>{{ $t('account.orders.detail.total') }}</span>
              <span>{{ money(order?.totalPrice) }}</span>
            </div>
          </UCard>
        </section>

        <section
          v-for="address in addresses"
          :key="address.label"
        >
          <h2 class="text-lg text-gray-900 font-bold mb-3">
            {{ address.label }}
          </h2>

          <UCard>
            <address class="not-italic text-sm text-muted">
              <span
                v-for="line in address.value"
                :key="line"
                class="block"
              >
                {{ line }}
              </span>
            </address>
          </UCard>
        </section>
      </div>
    </div>
  </UContainer>
</template>
