<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { country, language, key: translationKey } = useTranslation()
const { y: scrollY } = useScroll(document)
const storefront = useStorefront()

const key = computed(() => `collections-${translationKey.value}`)

const { data } = await useAsyncData(key, async () => await storefront.request(`#graphql
    query FetchCollections($after: String, $before: String, $first: Int, $last: Int, $language: LanguageCode)
    @inContext(language: $language) {
        collections(
            after: $after
            before: $before
            first: $first
            last: $last
        ) {
            ...CollectionConnectionFields
        }
    }
    ${IMAGE_FRAGMENT}
    ${COLLECTION_FRAGMENT}
    ${COLLECTION_CONNECTION_FRAGMENT}
`, {
    variables: connectionParamsSchema.merge(localizationParamsSchema).parse({
        first: 10,
        language: language.value,
        country: country.value,
    }),
}), {
    transform: data => data.data?.collections?.edges,
})

const searchInitialized = ref(false)
const searchOpen = ref(false)

const menuOpen = ref(false)
const menuCollapsed = ref(false)

const cartOpen = ref(false)

const collections = computed<NavigationMenuItem[]>(() => data.value
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
        class: [
            'cursor-pointer',
            'relative',
            'px-2',
            'sm:px-3',
            'after:bg-primary',
            'after:absolute',
            'after:-top-0.5',
            'after:-right-1.5',
            'after:w-4',
            'after:h-4',
            'after:rounded-full',
            'after:left-auto',
            'after:content-["2"]',
            'after:text-[11px]',
            'after:text-white',
            'sm:after:-right-0.5',
        ],
        onSelect: () => cartOpen.value = true,
    },
])

watch(searchOpen, () => searchInitialized.value = true)
watch(scrollY, () => menuCollapsed.value = scrollY.value > 20, { immediate: true })
</script>

<template>
    <div class="h-12 mb-6">
        <div
            :class="[
                'border-b',
                'border-[var(--ui-border-muted)]',
                'relative',
                'z-10',
                'shadow-xs',
                'flex',
                'flex-col',
                'justify-center',
                'transition-[height]',
                'duration-150',
                'ease-in-out',
                'bg-[var(--ui-bg)]',
                {
                    'h-16 md:h-18': !menuCollapsed,
                    'h-12': menuCollapsed,
                },
            ]"
        >
            <UContainer class="flex flex-row justify-evenly items-center">
                <UButton
                    class="cursor-pointer px-2 mr-2 sm:px-3 lg:hidden"
                    variant="navigation"
                    icon="hugeicons:menu-02"
                    @click="menuOpen = true"
                />

                <Logo />

                <UNavigationMenu
                    highlight
                    highlight-color="primary"
                    orientation="horizontal"
                    :items="navigationItems"
                    class="grow"
                    :class="{
                        '[&_a]:after:-bottom-5': !menuCollapsed,
                    }"
                    :ui="{
                        linkLabel: 'font-normal',
                        link: 'after:transition-[bottom] after:duration-150 after:ease-in-out after:absolute',
                    }"
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
                    :class="{
                        '[&_a]:after:-bottom-4 [&_a]:md:after:-bottom-5': !menuCollapsed,
                    }"
                    :ui="{
                        link: 'after:transition-[bottom] after:duration-150 after:ease-in-out after:absolute',
                    }"
                />
            </UContainer>

            <NavigationMenu
                v-model="menuOpen"
                :collections="collections"
            />

            <CartMenu
                v-model="cartOpen"
            />

            <LazySearchMenu
                v-if="searchInitialized"
                v-model="searchOpen"
            />
        </div>
    </div>
</template>
