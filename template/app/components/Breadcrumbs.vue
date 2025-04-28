<script setup lang="ts">
const localePath = useLocalePath()
const { locales } = useI18n()
const route = useRoute()

const items = computed(() => {
    const items = route.path.split('/')
        .filter(path => !locales.value.find(locale => locale.code === path))
        .map((path, index) => {
            if (index === 0) {
                return {
                    label: 'Home',
                    to: localePath('/'),
                }
            }

            return {
                label: path.replace(/-/g, ' '),
                to: localePath(`/${path}`),
            }
        })

    return items.slice(0, -1)
})
</script>

<template>
    <UBreadcrumb :items="items" />
</template>
