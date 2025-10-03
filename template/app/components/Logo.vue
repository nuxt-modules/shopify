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
        class="flex items-center gap-3 mr-4 shrink-0"
    >
        <NuxtImg
            :src="logo?.url"
            :alt="logo?.altText || 'Nuxt Shopify'"
            provider="shopify"
            class="h-5 w-auto invert"
            width="50"
            height="22"
        />

        Demo Store
    </NuxtLink>
</template>
