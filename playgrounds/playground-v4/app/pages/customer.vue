<script setup lang="ts">
import type { CustomerDetailsQuery } from '#shopify/customer-account'

const session = useUserSession()

let customer: CustomerDetailsQuery['customer'] | undefined = undefined

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
    <h1>Welcome, {{ customer?.firstName && customer?.lastName ? `${customer.firstName} ${customer.lastName}` : 'Nuxt User' }}!</h1>
    <p>E-Mail: {{ customer?.emailAddress?.emailAddress }}</p>
  </div>
</template>
