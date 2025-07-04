<script setup>
const slug = useRoute().params.slug

const { locale } = useI18n()

const { data } = await useAsyncData(`page-${slug}-${locale.value}`, async () =>
    await queryCollection('content').path(`/${locale.value}/${slug}`).first())

if (!data.value) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Page not found',
    })
}

useHead({
    title: `${data.value.title} | Nuxt Shopify Demo Store`,
    meta: [
        {
            name: 'description',
            content: data.value.description,
        },
    ],
})
</script>

<template>
    <ContentRenderer :value="data" />
</template>
