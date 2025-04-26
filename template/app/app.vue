<script setup lang="ts">
import type { FetchCollectionsQuery } from '#shopify/storefront'

import * as locales from '@nuxt/ui/locale'
import { useElementBounding } from '@vueuse/core'

const { locale } = useI18n()

const navigation = ref<HTMLElement>()
const navigationBounding = useElementBounding(navigation)

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },
    meta: [
        {
            name: 'robots',
            content: 'noindex, nofollow',
        },
    ],
})

const { data, error } = await useFetch<FetchCollectionsQuery>('/api/collections', {
    method: 'POST',
    body: {
        first: 10,
    },
})

if (error.value) {
    throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch collections',
        fatal: true,
    })
}

const collections = computed(() => data.value!.collections.edges)

provide('navigation:bounding', navigationBounding)
</script>

<template>
    <UApp
        :locale="locales[locale]"
    >
        <div class="min-h-screen flex flex-col">
            <NuxtLoadingIndicator />

            <Navigation
                ref="navigation"
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
