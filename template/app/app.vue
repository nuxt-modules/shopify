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

onMounted(async () => {
    if (!id.value) await init()

    await get()
})
</script>

<template>
    <UApp :locale="locales[language]">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
