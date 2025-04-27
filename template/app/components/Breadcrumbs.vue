<script setup lang="ts">
const route = useRoute()

const items = computed(() => {
    const items = route.path.split('/').map((path, index) => {
        if (index === 0) {
            return {
                label: 'Home',
                to: '/',
            }
        }

        return {
            label: path.replace(/-/g, ' '),
            to: `/${path}`,
        }
    })

    return items.slice(0, -1)
})
</script>

<template>
    <UBreadcrumb :items="items" />
</template>
