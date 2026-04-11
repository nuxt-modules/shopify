<script setup lang="ts">
import type { Customer } from '#shopify/storefront'

const session = useUserSession()

let customer: Partial<Customer> | undefined = undefined

if (!session.loggedIn) {
  navigateTo('/_auth/customer-account/callback')
}
else {
  const customerAccount = useCustomerAccount()

  const { data } = await customerAccount.request(`#graphql
    query CustomerDetails {
      customer {
        ...CustomerFields
      }
    }
    ${CUSTOMER_FRAGMENT}
  `)

  customer = data?.customer
}
</script>

<template>
  <div>
    <pre>{{ customer?.firstName }} {{ customer?.lastName }}</pre>
  </div>
</template>
