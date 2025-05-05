<script setup lang="ts">
const { t } = useI18n()

const { isDark, swap } = useTheme()

const languageOpen = ref(false)
</script>

<template>
    <footer class="pt-8 pb-6 bg-[var(--bg-ui)] border-t border-[var(--ui-border)]">
        <UContainer class="flex flex-col">
            <div class="text-lg">
                Footer content goes here.
            </div>

            <USeparator class="mt-8 mb-6" />

            <div class="flex flex-col items-center gap-4 md:flex-row">
                <p class="text-muted grow">
                    {{ t('footer.message') }}
                </p>

                <UButton
                    label="Change Language"
                    :icon="icons.globe"
                    variant="navigation"
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
                            class: 'px-3',
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
