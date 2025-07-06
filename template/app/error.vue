<script setup lang="ts">
import type { NuxtError } from '#app'

import * as locales from '@nuxt/ui/locale'

const props = defineProps({
    error: Object as () => NuxtError,
})

const { locale, t } = useI18n()

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

const errorType = computed(() => {
    if (props.error?.statusCode === 404) {
        return '404'
    }

    return '500'
})

const { data } = await useAsyncData(`page-${errorType.value}-${locale.value}`, async () =>
    await queryCollection('content').path(`/${locale.value}/error/${errorType.value}/`).first())

useHead({
    title: data.value?.title,
    meta: [
        {
            name: 'description',
            content: data.value?.description,
        },
    ],
})
</script>

<template>
    <UApp :locale="locales[locale]">
        <div class="min-h-screen flex flex-col">
            <NuxtLoadingIndicator color="var(--color-green-500)" />

            <Navigation class="sticky top-0 z-50 bg-[var(--ui-bg)]" />

            <NuxtLayout
                class="flex flex-col grow"
            >
                <ContentRenderer
                    v-if="data"
                    :value="data"
                />

                <div v-else>
                    <h1 class="text-4xl font-bold mb-4">
                        {{ errorType }} - {{ t('error.title') }}
                    </h1>

                    <p class="text-lg">
                        {{ t('error.message') }}
                    </p>
                </div>
            </NuxtLayout>

            <Footer />
        </div>
    </UApp>
</template>
