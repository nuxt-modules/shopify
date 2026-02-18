<script setup lang="ts">
const props = defineProps<{
    handle: string
}>()

const key = computed(() => `menu-${props.handle}`)

const { data: items } = await useStorefrontData(key, `#graphql
    query GetNavigation($handle: String!, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
        menu(handle: $handle) {
            ...MenuFields
        }
    }
    ${MENU_FRAGMENT}
    ${MENU_ITEM_FRAGMENT}
`, {
    variables: {
        handle: props.handle,
        language: 'EN',
        country: 'US',
    },
    transform: data => data.menu?.items?.map(item => ({
        label: item.title,
        to: item.url ?? undefined,
    })) ?? [],
})
</script>

<template>
    <UNavigationMenu :items="items" />
</template>
