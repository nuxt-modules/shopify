<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()

const { data: customer, error } = await useCustomerAccountData('account-orders', `#graphql
  query FetchAccountOrders($first: Int) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            ...OrderFields
          }
        }
      }
    }
  }
  ${ORDER_FRAGMENT}
`, {
  variables: customerOrdersInputSchema.parse({ first: 50 }),
  transform: data => data?.customer,
})

if (!customer.value || error.value) {
  throw createError({
    status: 404,
    statusText: $t('error.notFound'),
    message: error.value?.message || $t('account.toast.error.get'),
    fatal: true,
  })
}

const orders = computed(() => flattenConnection(customer.value?.orders))

useSeoMeta({
  title: `${$t('account.orders.title')} | ${shopName}`,
  description: $t('account.description'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('account.label'), to: localePath('/account') },
        { label: $t('account.orders.title') },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold">
      {{ $t('account.orders.title') }}
    </h1>

    <AccountOrders :orders="orders" />
  </UContainer>
</template>
