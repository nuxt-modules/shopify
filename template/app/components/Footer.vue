<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { t } = useI18n()

const { isDark, swap } = useTheme()

const { data: version } = await useFetch<{ tag_name?: string }>('https://api.github.com/repos/konkonam/nuxt-shopify/releases/latest', {
    key: 'nuxt-shopify-version',
    pick: ['tag_name'],
})

const items = computed<NavigationMenuItem[]>(() => [
    {
        to: 'https://github.com/konkonam/nuxt-shopify',
        label: 'Github',
    },
    {
        to: 'https://nuxt.com/modules/nuxt-shopify',
        label: 'Module Page',
    },
    {
        to: 'https://konkonam.github.io/nuxt-shopify',
        label: 'Documentation',
    },
    {
        to: 'https://npmjs.com/package/@konkonam/nuxt-shopify',
        label: 'NPM Package',
    },
].map(item => ({
    ...item,
    class: 'text-muted px-3 hover:text-primary',
    target: '_blank',
    icon: icons.dash,
})))
</script>

<template>
    <footer class="pt-8 pb-6 bg-[var(--bg-ui)] border-t border-[var(--ui-border)]">
        <UContainer>
            <div class="md:flex items-center gap-4">
                <p class="pb-2 pe-3 md:pb-4">
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
                            linkLabelExternalIcon: 'hidden',
                            linkLeadingIcon: 'size-2.5 mt-0.5 md:hidden',
                        }"
                    />
                </div>
            </div>

            <USeparator class="my-8 md:my-6" />

            <div class="flex flex-col items-center md:flex-row">
                <p class="text-muted grow pb-5 md:pb-0">
                    {{ t('footer.message') }}
                </p>

                <NavigationCountry class="mb-1 md:mb-0" />

                <NavigationLanguage class="mb-3 md:mb-0" />

                <USeparator
                    orientation="vertical"
                    class="h-5 mx-6 hidden md:block"
                />

                <UNavigationMenu
                    orientation="horizontal"
                    :items="[
                        {
                            icon: isDark ? icons.sun : icons.moon,
                            class: 'cursor-pointer px-3',
                            onSelect: () => swap(),
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
    </footer>
</template>
