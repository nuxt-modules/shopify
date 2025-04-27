<script setup lang="ts">
import type { FetchCollectionsQuery } from '#shopify/storefront'

const props = defineProps<{
    collections: FetchCollectionsQuery['collections']['edges']
}>()

const mobileNav = ref<HTMLElement>()
const open = ref(false)

const theme = useTheme()

useHead({
    bodyAttrs: {
        class: computed(() => open.value ? 'overflow-hidden' : ''),
    },
})

onClickOutside(mobileNav, () => {
    open.value = false
}, { ignore: ['.menu-button'] })

// @TODO: find a dynamic solution
const selectedCollections = [
    'Shirts',
    'Jackets',
    'Jeans & Pants',
    'Sweatshirts & Pullovers',
]

const collections = props.collections
    .filter(collection => selectedCollections.includes(collection.node.title))
    .map(collection => ({
        label: collection.node.title,
        to: getCollectionAppUrl(collection.node.handle),
    }))

const items = computed(() => [
    collections.map(collection => ({
        ...collection,
        class: 'hidden md:block',
    })),
    [
        {
            icon: theme.currentIcon.value,
            onSelect: theme.swap,
            description: 'Toggle color theme',
            class: 'cursor-pointer',
        },
        {
            icon: icons.account,
            to: getAccountAppUrl(),
        },
        {
            icon: icons.cart,
            to: getCartAppUrl(),
        },
        {
            icon: open.value ? icons.close : icons.menu,
            onSelect: () => {
                open.value = !open.value
            },
            class: 'menu-button md:hidden cursor-pointer',
        },
    ],
])
</script>

<template>
    <div class="border-b border-[var(--ui-border)] relative z-10">
        <UContainer class="flex flex-row justify-evenly items-center">
            <NuxtLink
                to="/"
                class="flex items-center gap-3 mr-4"
            >
                <NuxtImg
                    src="/img/logo.png"
                    class="h-5 w-auto"
                    :class="{
                        invert: theme.colorMode.value === 'light',
                    }"
                />

                Nuxt Shopify
            </NuxtLink>

            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="horizontal"
                :items="items"
                class="grow"
            />
        </UContainer>

        <UCollapsible
            :open="open"
            class="absolute top-full w-full md:hidden"
        >
            <template #content>
                <UNavigationMenu
                    ref="mobileNav"
                    highlight
                    highlight-color="primary"
                    orientation="vertical"
                    :items="collections.map(collection => ({
                        ...collection,
                        onSelect: () => open = false,
                    }))"
                    class="border-y border-[var(--ui-border)] grow bg-[var(--ui-bg)] py-4 duration-100"
                />

                <Transition
                    enter-from-class="opacity-0"
                    enter-to-class="opacity-100"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                >
                    <div
                        v-if="open"
                        class="-z-10 fixed inset-0 top-12 backdrop-blur-xs transition-opacity duration-100"
                        @click="open = false"
                    />
                </Transition>
            </template>
        </UCollapsible>
    </div>
</template>
