<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { shopify: { shopName } } = useAppConfig()
const { language } = useLocalization()
const { id, init, get } = useCart()

const lang = computed(() => locales[language.value].code)
const dir = computed(() => locales[language.value].dir)

useHead({
    htmlAttrs: {
        lang,
        dir,
    },

    title: shopName,

    meta: [
        { property: 'og:image', content: 'https://shopify.nuxtjs.org/logo-readme.jpg' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://shopify.nuxtjs.org/logo-readme.jpg' },
        { name: 'twitter:image:src', content: 'https://shopify.nuxtjs.org/logo-readme.jpg' },
        { property: 'og:image:width', content: '1200' },
        { name: 'twitter:image:width', content: '1200' },
        { property: 'og:image:height', content: '600' },
        { name: 'twitter:image:height', content: '600' },
    ],
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
