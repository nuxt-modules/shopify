<script setup lang="ts">
const customerAccount = useCustomerAccount()

const { data, errors } = await customerAccount.request(`#graphql
  query GetCustomerData {
    shop {
      id
    }
  }
`)

console.log(data, errors)
</script>

<template>
    <div>
        <h1>Account</h1>
    </div>
</template>
