<script setup lang="ts">
const customerAccount = useCustomerAccount()

const { data } = await customerAccount.request(`#graphql
  query CustomerDetails {
    customer {
      ...CustomerFields
    }
  }
  ${CUSTOMER_FRAGMENT}
`)
</script>

<template>
  <div>
    <pre>{{ data?.customer.firstName }}</pre>
  </div>
</template>
