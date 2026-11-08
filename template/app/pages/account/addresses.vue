<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const { login } = useCustomerAccountSession()
const route = useRoute()
const { t } = useI18n()

const { data: customer, error, refresh } = await useCustomerAccountData('account-addresses', `#graphql
  query FetchAccountAddresses($first: Int) {
    customer {
      defaultAddress {
        id
      }
      addresses(first: $first) {
        edges {
          node {
            ...AddressFields
          }
        }
      }
    }
  }
`, {
  variables: customerAddressesInputSchema.parse({}),
  transform: data => data?.customer,
})

if (error.value?.status === 401) {
  await login({ returnTo: route.fullPath })
}
else if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message || t('account.toast.error.get'),
    fatal: true,
  })
}

const addresses = computed(() => flattenConnection(customer.value?.addresses))

useSeoMeta({
  title: `${t('account.addresses.title')} | ${shopName}`,
  description: t('account.addresses.description'),
})
</script>

<template>
  <AccountAddresses
    :addresses="addresses"
    :default-address-id="customer?.defaultAddress?.id"
    @updated="refresh()"
  />
</template>
