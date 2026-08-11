<script setup lang="ts">
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

      <AccountMenu />

      <AppLocaleSelect>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-languages"
          :aria-label="$t('localization.title')"
        />
      </AppLocaleSelect>

      <CartModal />
    </template>
  </UHeader>
</template>
