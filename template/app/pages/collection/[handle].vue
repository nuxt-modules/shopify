<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const { locale } = useI18n()
const { country } = useCountry()
const route = useRoute()

const handle = route.params.handle as string

const key = computed(() => [
    'collection',
    handle,
    locale.value,
    country.value,
].join('-'))

const { data, error } = await useFetch('/api/collection', {
    key,
    method: 'POST',
    body: {
        handle,
        language: locale.value,
        country: country.value,
    },
})

if (error.value) throw createError({
    statusCode: 500,
    statusMessage: `Failed to fetch collection with handle ${handle}`,
    fatal: true,
})
</script>

<template>
    <div>
        <h1 class="text-2xl font-bold">
            {{ data?.collection?.title }}
        </h1>

        <ProductListing
            :handle="handle"
        />
    </div>
</template>
