<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { isDark } = useTheme()
const { locale } = useI18n()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },
    bodyAttrs: {
        class: 'antialiased',
    },
    title: 'Nuxt Shopify Demo Store',
})
</script>

<template>
    <UApp :locale="locales[locale]">
        <div class="min-h-screen flex flex-col">
            <NuxtLoadingIndicator :color="isDark ? '#fff' : '#000'" />

            <Navigation class="sticky top-0 z-50 bg-[var(--ui-bg)]" />

            <NuxtLayout class="flex flex-col grow">
                <NuxtPage />
            </NuxtLayout>

            <Footer />
        </div>
    </UApp>
</template>
