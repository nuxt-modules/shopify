<script setup lang="ts">
const { logout } = useCustomerAccountSession()

await logout()
</script>

<template>
  <div class="flex justify-center py-16">
    <UIcon
      name="i-lucide-loader-circle"
      class="size-8 animate-spin text-muted"
    />
  </div>
</template>
