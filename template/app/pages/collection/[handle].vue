<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { country, language } = useTranslation()
const route = useRoute()

const handle = route.params.handle as string

const key = computed(() => [
    'collection',
    handle,
    language.value,
    country.value,
].join('-'))

const { data } = await useFetch('/api/collection', {
    key,
    method: 'POST',
    body: {
        handle,
        language: language.value,
        country: country.value,
    },
})
</script>

<template>
    <div>
        <h1 class="text-2xl">
            {{ data?.collection?.title }}
        </h1>

        <ProductListing
            :handle="handle"
        />
    </div>
</template>
