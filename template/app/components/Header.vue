<script setup lang="ts">
const { language, country } = useLocalization()
const localePath = useLocalePath()
const { locale } = useI18n()

const { data } = await useAsyncStorefront(`collections-${locale.value}`, `#graphql
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
    variables: connectionParamsSchema.extend(localizationParamsSchema.shape).parse({
        first: 10,
        language: language.value,
        country: country.value,
    }),
}, {
    transform: data => flattenConnection(data?.collections),
})

const collections = computed(() => data.value
    ?.map(collection => ({
        label: collection.title,
        to: localePath(`/collection/${collection.handle}`),
    })) ?? [])

const searchOpen = ref(false)
</script>

<template>
    <div class="sticky top-0 border-b border-b-[var(--ui-border)] z-10">
        <UContainer class="flex justify-between py-2 bg-[var(--ui-bg)]/60 backdrop-blur-lg">
            <Logo />

            <UNavigationMenu
                :items="collections"
                class="w-full justify-center hidden md:flex"
            />

            <div class="flex items-center gap-2">
                <UButton
                    icon="i-lucide-search"
                    variant="ghost"
                    color="neutral"
                    label="Search"
                    @click="searchOpen = !searchOpen"
                />

                <UDropdownMenu
                    :items="collections"
                    :content="{
                        align: 'end',
                    }"
                    class="md:hidden"
                >
                    <UButton
                        icon="i-lucide-menu"
                        color="neutral"
                        variant="ghost"
                    />
                </UDropdownMenu>
            </div>
        </UContainer>

        <Search v-model="searchOpen" />
    </div>
</template>
