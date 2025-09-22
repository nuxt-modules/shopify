<script setup lang="ts">
type NPMResponse = { version?: string }

const { data: version } = await useAsyncData('nuxt-shopify-version', () =>
    $fetch<NPMResponse>('https://registry.npmjs.org/@nuxtjs/shopify/latest').then(data => data?.version))
</script>

<template>
    <p class="pb-2 pe-3 md:pb-4">
        <span class="text-sm text-muted">
            Built with
        </span>

        <br>

        <span class="font-medium">
            Nuxt Shopify v{{ version }}
        </span>
    </p>
</template>
