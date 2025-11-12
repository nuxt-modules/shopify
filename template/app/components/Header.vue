<script setup lang="ts">
const { language, country } = useLocalization()
const localePath = useLocalePath()
const { quantity } = useCart()

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
    <div class="sticky top-0 border-b border-b-default z-10">
        <UContainer class="flex justify-between py-3 bg-(--ui-bg)/60 backdrop-blur-lg">
            <Logo />

            <UNavigationMenu
                :items="items"
                class="w-full justify-center hidden lg:flex"
            />

            <div class="flex items-center gap-2">
                <Search />

                <div class="relative">
                    <Cart />

                    <ClientOnly>
                        <UBadge
                            v-if="quantity"
                            class="absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2"
                            size="xs"
                        >
                            {{ quantity }}
                        </UBadge>
                    </ClientOnly>
                </div>

                <UDropdownMenu
                    :items="items"
                    :content="{
                        align: 'end',
                    }"
                    class="lg:hidden"
                >
                    <UButton
                        icon="i-lucide-menu"
                        color="neutral"
                        variant="ghost"
                    />
                </UDropdownMenu>
            </div>
        </UContainer>
    </div>
</template>
