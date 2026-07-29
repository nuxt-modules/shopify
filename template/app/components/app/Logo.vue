<script setup lang="ts">
const localePath = useLocalePath()

const { data: logo } = await useStorefrontData('logo', `#graphql
  query FetchLogo {
    shop {
      brand {
        logo {
          image {
            ...ImageFields
          }
        }
      }
    }
  }
  ${IMAGE_FRAGMENT}
`, {
  transform: data => data?.shop?.brand?.logo?.image,
})
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="flex items-center gap-1 mr-4 shrink-0 font-bold"
  >
    <NuxtImg
      :src="logo?.url"
      :alt="logo?.altText || 'Nuxt Shopify Store Logo'"
      provider="shopify"
      class="h-7 w-auto mb-0.5"
      width="50"
      height="50"
      loading="eager"
      fetchpriority="high"
    />

    <span class="text-primary">Nuxt</span> Shopify
  </NuxtLink>
</template>
