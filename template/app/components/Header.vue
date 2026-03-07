<script setup lang="ts">
const { language, country } = useLocalization()
const localePath = useLocalePath()

const getCollectionUrl = (handle: string) => localePath(`/collection/${handle}`)
const getBlogUrl = (handle: string) => localePath(`/blog/${handle}`)

const { data: items } = await useStorefrontData('main-menu', `#graphql
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
        language: language.value,
        country: country.value,
    }),
    transform: data => data.menu?.items?.map(item => ({
        label: item.title,
        to: item.resource?.__typename === 'Blog'
            ? getBlogUrl(item.resource?.handle)
            : item.resource?.__typename === 'Collection'
                ? getCollectionUrl(item.resource?.handle)
                : item.url ?? undefined,
    })) ?? [],
})
</script>

<template>
    <UHeader title="Nuxt Shopify">
        <template #left>
            <Logo />
        </template>

        <UNavigationMenu
            :items="items"
        />

        <template #body>
            <UNavigationMenu
                :items="items"
                orientation="vertical"
            />
        </template>

        <template #right>
            <SearchModal />

            <CartModal />
        </template>
    </UHeader>
</template>
