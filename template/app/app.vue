<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },
})

const { data, error } = await useFetch('/api/collections', {
    method: 'POST',
    body: {
        first: 10,
        language: locale,
    },
    key: computed(() => `collections-${locale.value}`),
    watch: [locale],
})

if (error.value) {
    throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch collections',
        fatal: true,
    })
}

const collections = computed(() => data.value?.collections.edges)
</script>

<template>
    <UApp
        :locale="locales[locale]"
    >
        <div class="min-h-screen flex flex-col">
            <NuxtLoadingIndicator />

            <Navigation
                v-if="collections"
                :key="`navigation-${locale}`"
                :collections="collections"
                class="sticky top-0 z-50 bg-[var(--ui-bg)]"
            />

            <NuxtLayout class="flex flex-col grow">
                <NuxtPage />
            </NuxtLayout>

            <Footer />
        </div>
    </UApp>
</template>
