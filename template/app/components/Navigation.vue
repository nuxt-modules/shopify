<script setup lang="ts">
import type { FetchCollectionsQuery } from '#shopify/storefront'

const props = defineProps<{
    collections: FetchCollectionsQuery['collections']['edges']
}>()

const { isDark, swap } = useTheme()

const mobileNavOpen = ref(false)
const languageNavOpen = ref(false)

const collections = props.collections
    .map(collection => ({
        label: collection.node.title,
        to: getCollectionAppUrl(collection.node.handle),
    }))

const items = computed(() => [
    collections.map(collection => ({
        ...collection,
        class: 'hidden lg:block',
    })),
    [
        {
            icon: isDark.value ? icons.sun : icons.moon,
            description: 'Toggle color theme',
            class: 'px-2 md:px-3 cursor-pointer',
            onSelect: swap,
        },
        {
            icon: languageNavOpen.value ? icons.close : icons.globe,
            class: 'px-2 md:px-3 language-button cursor-pointer',
            onSelect: () => languageNavOpen.value = !languageNavOpen.value,
        },
        {
            icon: icons.account,
            class: 'px-2 md:px-3',
            to: getAccountAppUrl(),
        },
        {
            icon: icons.cart,
            class: 'px-2 md:px-3',
            to: getCartAppUrl(),
        },
        {
            icon: mobileNavOpen.value ? icons.close : icons.menu,
            class: 'px-2 md:px-3 menu-button cursor-pointer lg:hidden',
            onSelect: () => mobileNavOpen.value = !mobileNavOpen.value,
        },
    ],
])

useHead({
    bodyAttrs: {
        class: computed(() => mobileNavOpen.value ? 'overflow-hidden' : ''),
    },
})
</script>

<template>
    <div class="border-b border-[var(--ui-border)] relative z-10">
        <UContainer class="flex flex-row justify-evenly items-center">
            <Logo />

            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="horizontal"
                :items="items"
                class="grow"
            />
        </UContainer>

        <NavigationMobile
            v-model="mobileNavOpen"
            :collections="collections"
        />

        <NavigationLanguage
            v-model="languageNavOpen"
        />
    </div>
</template>
