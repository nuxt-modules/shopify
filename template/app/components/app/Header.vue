<script setup lang="ts">
import { withoutHost } from 'ufo'

const localePath = useLocalePath()

const { public: { _shopify } } = useRuntimeConfig()

const hasAccount = computed(() => !!_shopify?.clients?.customerAccount)

const { data: items } = await useStorefrontData(localizedKey('main-menu'), `#graphql
  query GetNavigation($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    menu(handle: $handle) {
      ...MenuFields
    }
  }
  ${MENU_FRAGMENT}
`, {
  variables: menuGetInputSchema.parse({
    handle: 'main-menu',
  }),
  transform: data => data.menu?.items?.map(item => ({
    label: item.title,
    to: item.resource?.__typename === 'Blog'
      ? localePath(`/blog/${item.resource?.handle}`)
      : item.resource?.__typename === 'Collection'
        ? localePath(`/collection/${item.resource?.handle}`)
        : withoutHost(item.url ?? ''),
  })) ?? [],
  cache: 'long',
})
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
    </template>
  </UHeader>
</template>
