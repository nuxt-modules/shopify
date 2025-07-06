<script setup>
const { locale } = useI18n()

const { data } = await useAsyncData(`page-home-${locale.value}`, async () =>
    await queryCollection('content').path(`/${locale.value}/`).first())

useHead({
    title: data.value.title,
    meta: [
        {
            name: 'description',
            content: data.value.description,
        },
    ],
})
</script>

<template>
    <ContentRenderer
        :value="data"
        class="flex flex-col gap-14 my-6 md:gap-24"
    />
</template>
