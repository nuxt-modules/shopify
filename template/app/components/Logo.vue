<script setup lang="ts">
const theme = useTheme()

const invert = ref(false)

onMounted(() => {
    console.log(theme.colorMode.value)
    invert.value = theme.colorMode.value !== 'dark'
})
</script>

<template>
    <NuxtLink
        to="/"
        class="flex items-center gap-3 mr-4 shrink-0"
    >
        <NuxtImg
            src="/img/logo.png"
            class="h-5 w-auto light:invert"
        />

        Nuxt Shopify
    </NuxtLink>
</template>
