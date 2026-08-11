<script setup lang="ts">
const { public: { _shopify } } = useRuntimeConfig()

const hasAccount = computed(() => !!_shopify?.clients?.customerAccount)

const { data: items } = await useMenu('main-menu')
</script>

<template>
  <UHeader title="Nuxt Shopify">
    <template #left>
      <AppLogo />
    </template>

    <UNavigationMenu
      :items="items ?? []"
    />

    <template #body>
      <UNavigationMenu
        :items="items ?? []"
        orientation="vertical"
      />
    </template>

    <template #right>
      <SearchModal />

      <AccountMenu v-if="hasAccount" />

      <CartModal />

      <AppLocaleSelect>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-globe"
          :aria-label="$t('localization.title')"
        />
      </AppLocaleSelect>
    </template>
  </UHeader>
</template>
