<script setup lang="ts">
const { data: items } = await useAsyncStorefront('collections', `#graphql
    query GetNavigation($language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
        menu(handle: "main-menu") {
            items {
                ... on MenuItem {
                    title
                    url
                    type
                }
            }
        }
    }
`, {
    variables: {
        language: 'EN',
        country: 'US',
    },
}, {
    transform: data => data.menu?.items?.map(item => ({
        label: item.title,
        to: item.url!,
    })) ?? [],
})
</script>

<template>
    <div class="flex justify-center">
        <UNavigationMenu :items="items" />
    </div>
</template>
