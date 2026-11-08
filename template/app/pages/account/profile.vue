<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const { login } = useCustomerAccountSession()
const route = useRoute()
const { t } = useI18n()

const { data: customer, error, refresh } = await useCustomerAccountData('account-profile', `#graphql
  query FetchAccountProfile {
    customer {
      ...CustomerFields
    }
  }
`, {
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

useSeoMeta({
  title: `${t('account.profile.title')} | ${shopName}`,
  description: t('account.description'),
})
</script>

<template>
  <section>
    <h2 class="text-2xl lg:text-3xl text-gray-900 font-bold mb-6 lg:mb-8">
      {{ $t('account.profile.title') }}
    </h2>

    <AccountProfile
      v-if="customer"
      :customer="customer"
      @updated="refresh()"
    />
  </section>
</template>
