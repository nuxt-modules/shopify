<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { country } = useCountry()
const { locale } = useI18n()

const { data } = await useFetch('/api/collections', {
    key: 'collections',
    method: 'POST',
    body: {
        first: 10,
        language: locale,
        country: country,
    },
    watch: [locale, country],
})

const searchInitialized = ref(false)
const searchOpen = ref(false)

const menuOpen = ref(false)

const collections = computed<NavigationMenuItem[]>(() => data.value?.collections.edges
    ?.map(collection => ({
        label: collection.node.title,
        to: getCollectionAppUrl(collection.node.handle),
    })) ?? [])

const navigationItems = computed<NavigationMenuItem[]>(() => collections.value
    .map(collection => ({
        ...collection,
        class: 'px-3 hidden lg:block hover:text-primary',
    })))

const navigationActions = computed<NavigationMenuItem[]>(() => [
    {
        icon: 'hugeicons:user',
        class: 'cursor-pointer px-2 sm:px-3',
        to: getAccountAppUrl(),
    },
    {
        icon: 'hugeicons:shopping-bag-01',
        class: 'cursor-pointer px-2 sm:px-3',
        to: getCartAppUrl(),
    },
    {
        icon: 'hugeicons:menu-collapse',
        class: 'cursor-pointer px-2 sm:px-3 lg:hidden',
        active: menuOpen.value,
        onSelect: () => menuOpen.value = !menuOpen.value,
    },
])

watch(searchOpen, () => searchInitialized.value = true)
</script>

<template>
    <div class="border-b border-[var(--ui-border-muted)] relative z-10 shadow-xs">
        <UContainer class="flex flex-row justify-evenly items-center">
            <Logo />

            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="horizontal"
                :items="navigationItems"
                class="grow"
            />

            <SearchButton
                v-model="searchOpen"
                class="px-2 sm:mr-6 xl:mr-8"
            />

            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="horizontal"
                :items="navigationActions"
            />
        </UContainer>

        <NavigationMenu
            v-model="menuOpen"
            :collections="collections"
        />

        <LazySearchMenu
            v-if="searchInitialized"
            v-model="searchOpen"
        />
    </div>
</template>
