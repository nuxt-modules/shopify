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
            onSelect: swap,
            description: 'Toggle color theme',
            class: 'px-2 md:px-3 cursor-pointer',
        },
        {
            icon: languageNavOpen.value ? icons.close : icons.globe,
            onSelect: () => {
                languageNavOpen.value = !languageNavOpen.value
            },
            class: 'px-2 md:px-3 language-button cursor-pointer',
        },
        {
            icon: icons.account,
            to: getAccountAppUrl(),
            class: 'px-2 md:px-3',
        },
        {
            icon: icons.cart,
            to: getCartAppUrl(),
            class: 'px-2 md:px-3',
        },
        {
            icon: mobileNavOpen.value ? icons.close : icons.menu,
            onSelect: () => {
                mobileNavOpen.value = !mobileNavOpen.value
            },
            class: 'px-2 md:px-3 menu-button cursor-pointer lg:hidden',
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
