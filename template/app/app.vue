<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { language } = useLocalization()
const { id, init, get } = useCart()

const lang = computed(() => locales[language.value].code)
const dir = computed(() => locales[language.value].dir)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },
    title: 'Nuxt Shopify Demo Store',
})

watch(id, value => !value ? init().then(get) : get(), { immediate: true })
</script>

<template>
    <UApp :locale="locales[language]">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
