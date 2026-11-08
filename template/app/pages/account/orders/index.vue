<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const { login } = useCustomerAccountSession()
const route = useRoute()

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
`, {
  variables: customerOrdersInputSchema.parse({ first: 50 }),
  transform: data => data?.customer,
})

if (error.value?.status === 401) {
  await login({ returnTo: route.fullPath })
}
else if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message || $t('account.toast.error.get'),
    fatal: true,
  })
}

const orders = computed(() => flattenConnection(customer.value?.orders))

useSeoMeta({
  title: `${$t('account.orders.title')} | ${shopName}`,
  description: $t('account.description'),
})
</script>

<template>
  <AccountOrders :orders="orders" />
</template>
