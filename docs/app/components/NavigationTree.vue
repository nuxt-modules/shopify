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
        to: item.url,
        icon: item.type === 'COLLECTION'
            ? 'i-lucide-folder'
            : item.type === 'BLOG'
                ? 'i-lucide-rss'
                : 'i-lucide-file',
    })) ?? [],
})
</script>

<template>
    <div class="flex justify-center">
        <UNavigationMenu
            :items="items"
            class="w-full max-w-2xs"
            orientation="vertical"
        />
    </div>
</template>
