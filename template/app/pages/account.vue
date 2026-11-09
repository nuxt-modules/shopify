<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({
  middleware: 'shopify:customer-account',
})

const { login } = useCustomerAccountSession()
const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()

const { data: customer, error } = await useCustomerAccountData('account-customer', `#graphql
  query FetchAccountCustomer {
    customer {
      firstName
      lastName
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

const name = computed(() => [customer.value?.firstName, customer.value?.lastName].filter(Boolean).join(' '))

const links = computed<NavigationMenuItem[]>(() => [
  { label: t('account.orders.title'), to: localePath('/account/orders'), icon: 'i-lucide-package' },
  { label: t('account.profile.title'), to: localePath('/account/profile'), icon: 'i-lucide-user-round' },
  { label: t('account.addresses.title'), to: localePath('/account/addresses'), icon: 'i-lucide-map-pin-house' },
])

useSeoMeta({
  robots: 'noindex, nofollow',
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: $t('account.label'), to: localePath('/account') }]"
      class="mb-6 lg:mb-8"
    />

    <div class="flex flex-wrap items-center justify-between gap-4 mb-6 lg:mb-8">
      <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold">
        {{ name ? $t('account.greeting', { name }) : $t('account.welcome') }}
      </h1>

      <form
        method="post"
        action="/account/logout"
      >
        <UButton
          type="submit"
          variant="outline"
          color="neutral"
          size="lg"
          :label="$t('account.logout')"
          icon="i-lucide-log-out"
        />
      </form>
    </div>

    <UNavigationMenu
      :items="links"
      highlight
      class="mb-8 lg:mb-10 border-b border-default"
    />

    <NuxtPage />
  </UContainer>
</template>
