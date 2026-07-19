<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const { logout, login } = useCustomerAccountSession()
const localePath = useLocalePath()
const { t } = useI18n()

const { data: customer, error, refresh } = await useCustomerAccountData('account', `#graphql
  query FetchAccount($first: Int, $addresses: Int) {
    customer {
      ...CustomerFields
      addresses(first: $addresses) {
        edges {
          node {
            ...AddressFields
          }
        }
      }
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            ...OrderFields
          }
        }
      }
    }
  }
  ${ADDRESS_FRAGMENT}
  ${CUSTOMER_FRAGMENT}
  ${ORDER_FRAGMENT}
`, {
  variables: {
    ...customerOrdersInputSchema.parse({ first: 1 }),
    addresses: customerAddressesInputSchema.parse({}).first,
  },
  transform: data => data?.customer,
})

if (!customer.value || error.value) {
  if (error.value?.status === 401) await login({
    returnTo: localePath('/account'),
  })

  throw createError({
    status: 404,
    statusText: t('error.notFound'),
    message: error.value?.message || t('account.toast.error.get'),
    fatal: true,
  })
}

const orders = computed(() => flattenConnection(customer.value?.orders))
const addresses = computed(() => flattenConnection(customer.value?.addresses))

const name = computed(() => [customer.value?.firstName, customer.value?.lastName].filter(Boolean).join(' '))

useSeoMeta({
  title: `${t('account.label')} | ${shopName}`,
  description: t('account.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('account.label') },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div class="flex flex-wrap items-center justify-between gap-4 mb-8 lg:mb-10">
      <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold">
        {{ name ? $t('account.greeting', { name }) : $t('account.welcome') }}
      </h1>

      <UButton
        :to="localePath('/account/logout')"
        variant="outline"
        color="neutral"
        size="lg"
        :label="$t('account.logout')"
        icon="i-lucide-log-out"
        @click="logout()"
      />
    </div>

    <div class="flex flex-col gap-10 lg:gap-14">
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

      <div>
        <AccountOrders :orders="orders" />

        <div
          v-if="orders?.length"
          class="mt-6 flex justify-center"
        >
          <UButton
            :to="localePath('/account/orders')"
            variant="soft"
            size="lg"
            :label="$t('account.orders.viewAll')"
            trailing-icon="i-lucide-arrow-right"
          />
        </div>
      </div>

      <AccountAddresses
        :addresses="addresses"
        :default-address-id="customer?.defaultAddress?.id"
        @updated="refresh()"
      />

      <section>
        <h2 class="text-2xl lg:text-3xl text-gray-900 font-bold mb-6 lg:mb-8">
          {{ $t('account.recommended') }}
        </h2>

        <ProductSlider
          :first="8"
          sort-key="BEST_SELLING"
          loading="lazy"
        />
      </section>
    </div>
  </UContainer>
</template>
