<script setup lang="ts">
import { joinURL } from 'ufo'

const { locale } = useI18n()
const route = useRoute()

const path = computed(() => route.path.includes(locale.value) ? route.path : `/${joinURL(locale.value, route.path)}`)

const { data: page } = await useAsyncData(`page-${route.path}`, () => queryCollection('content').path(path.value).first())

useSeoMeta({
    title: page.value?.title,
    description: page.value?.description,
})
</script>

<template>
    <UContainer class="py-12">
        <ContentRenderer
            v-if="page"
            :value="page"
            class="prose w-full max-w-none lg:prose-lg"
        />
    </UContainer>
</template>
