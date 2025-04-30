<script setup lang="ts">
const { locale, locales } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
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
                to: router.getRoutes().find(route => route.path === `/${locale}/${path}`) ? localePath(`/${path}`) : undefined,
            }
        })

    return items.slice(0, -1)
})
</script>

<template>
    <UBreadcrumb :items="items" />
</template>
