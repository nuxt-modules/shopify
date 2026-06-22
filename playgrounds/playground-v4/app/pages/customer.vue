<script setup lang="ts">
const { isLoggedIn, user, login, logout } = useCustomerAccountSession()

const customer = ref()

if (isLoggedIn.value) {
  const customerAccount = useCustomerAccount()

  const { data } = await customerAccount.request(`#graphql
    query CustomerDetails {
      customer {
        ...CustomerFields
      }
    }
    ${CUSTOMER_FRAGMENT}
  `)

  customer.value = data?.customer
}
</script>

<template>
  <div>
    <div v-if="isLoggedIn">
      <h1>Welcome, {{ customer?.firstName && customer?.lastName ? `${customer.firstName} ${customer.lastName}` : 'Nuxt User' }}!</h1>

      <p>E-Mail: {{ user?.email ?? customer?.emailAddress?.emailAddress }}</p>

      <button @click="logout()">
        Log out
      </button>
    </div>

    <div v-else>
      <button @click="login()">
        Log in
      </button>
    </div>
  </div>
</template>
