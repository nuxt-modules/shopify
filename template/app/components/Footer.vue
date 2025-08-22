<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

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
    target: '_blank',
    icon: 'hugeicons:solid-line-01',
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

                    <span class="font-medium">
                        Nuxt Shopify v0.0.31
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
                            linkLabel: 'font-normal',
                            linkLabelExternalIcon: 'hidden',
                            linkLeadingIcon: 'size-2.5 mt-0.5 md:hidden',
                        }"
                    />
                </div>
            </div>

            <USeparator class="my-8 md:my-6" />

            <div class="flex flex-col items-center md:flex-row">
                <p class="text-muted grow pb-5 md:pb-0">
                    {{ $t('footer.message') }}
                </p>

                <UNavigationMenu
                    orientation="horizontal"
                    :items="[
                        {
                            icon: 'i-lucide-github',
                            to: 'https://github.com/konkonam/nuxt-shopify/tree/main/template',
                            label: $t('footer.github'),
                            target: '_blank',
                        },
                    ]"
                    :ui="{
                        linkLabelExternalIcon: 'hidden',
                    }"
                />
            </div>
        </UContainer>
    </footer>
</template>
