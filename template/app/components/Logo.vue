<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
    <NuxtLink
        :to="localePath('/')"
        class="flex items-center gap-3 mr-4 shrink-0"
    >
        <NuxtImg
            src="/img/logo.png"
            class="h-5 w-auto light:invert"
        />

        Nuxt Shopify
    </NuxtLink>
</template>
