<script setup lang="ts">
const { data, error } = await useCustomerAccountData(`#graphql
  query GetCustomerData {
    customer {
      firstName
      lastName
    }
  }
`)

console.log(data.value, error.value)
</script>

<template>
    <div>
        <h1>Account</h1>

        {{ data?.customer?.firstName }} {{ data?.customer?.lastName }}
    </div>
</template>
