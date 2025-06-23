<script setup lang="ts">
const localePath = useLocalePath()

const storefront = useStorefront()

const { data, error } = await useAsyncData('logo', async () => await storefront.request(`#graphql
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
`), {
    transform: data => data?.data?.shop?.brand?.logo,
})

if (error.value) {
    throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch logo',
        data: error.value,
    })
}

const logoUrl = computed(() => data.value?.image?.url)
</script>

<template>
    <NuxtLink
        :to="localePath('/')"
        class="flex items-center gap-3 mr-4 shrink-0"
    >
        <NuxtImg
            :src="logoUrl"
            provider="shopify"
            class="h-5 w-auto light:invert"
            width="50"
            height="22"
        />

        Demo Store
    </NuxtLink>
</template>
