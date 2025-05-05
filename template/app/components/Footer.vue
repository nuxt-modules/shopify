<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { t } = useI18n()

const { isDark, swap } = useTheme()

const { data: version } = await useFetch<{ tag_name: string }>('https://api.github.com/repos/konkonam/nuxt-shopify/releases/latest', {
    key: 'nuxt-shopify-version',
})

const languageOpen = ref(false)

const items = computed<NavigationMenuItem[]>(() => [
    {
        to: 'https://github.com/konkonam/nuxt-shopify',
        class: 'text-muted px-3 hover:text-primary',
        label: 'Github',
    },
    {
        to: 'https://nuxt.com/modules/nuxt-shopify',
        class: 'text-muted px-3 hover:text-primary',
        label: 'Module Page',
    },
    {
        to: 'https://konkonam.github.io/nuxt-shopify',
        class: 'text-muted px-3 hover:text-primary',
        label: 'Documentation',
    },
    {
        to: 'https://npmjs.com/package/@konkonam/nuxt-shopify',
        class: 'text-muted px-3 hover:text-primary',
        label: 'NPM Package',
    },
])
</script>

<template>
    <footer class="pt-8 pb-6 bg-[var(--bg-ui)] border-t border-[var(--ui-border)]">
        <UContainer>
            <div class="md:flex items-center gap-4">
                <p class="pb-4 pe-3">
                    <span class="text-sm text-muted">
                        Built with
                    </span>

                    <br>

                    <span class="font-bold">
                        Nuxt Shopify v{{ version?.tag_name }}
                    </span>
                </p>

                <USeparator
                    orientation="vertical"
                    class="h-5 mx-2 mt-2 hidden md:block"
                />

                <div class="text-muted mt-2">
                    <UNavigationMenu
                        :items="items"
                        orientation="vertical"
                        :ui="{
                            list: 'md:flex',
                        }"
                    />
                </div>
            </div>

            <USeparator class="my-8 md:my-6" />

            <div class="flex flex-col items-center gap-4 md:flex-row">
                <p class="text-muted grow">
                    {{ t('footer.message') }}
                </p>

                <UButton
                    label="Change Language"
                    :icon="icons.globe"
                    variant="navigation"
                    class="cursor-pointer"
                    @click="languageOpen = true"
                />

                <USeparator
                    orientation="vertical"
                    class="h-5 mx-2 hidden md:block"
                />

                <UNavigationMenu
                    highlight
                    highlight-color="primary"
                    orientation="horizontal"
                    :items="[
                        {
                            icon: isDark ? icons.sun : icons.moon,
                            class: 'cursor-pointer px-3',
                            onSelect: () => swap(),
                        },
                        {
                            icon: icons.npm,
                            to: 'https://www.npmjs.com/package/@konkonam/nuxt-shopify',
                            target: '_blank',
                            class: 'px-3',
                        },
                        {
                            icon: icons.github,
                            to: 'https://github.com/konkonam/nuxt-shopify/tree/main/template',
                            target: '_blank',
                            class: 'px-3',
                        },
                    ]"
                />
            </div>
        </UContainer>

        <NavigationLanguage
            v-model="languageOpen"
        />
    </footer>
</template>
