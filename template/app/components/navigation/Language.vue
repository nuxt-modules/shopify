<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })

const switchLocalePath = useSwitchLocalePath()
const { locales } = useI18n()

const items = computed<NavigationMenuItem[]>(() => locales.value.map(locale => ({
    label: locale.name,
    to: switchLocalePath(locale.code),
    onSelect: () => open.value = false,
})))
</script>

<template>
    <UDrawer
        v-model:open="open"
        title="Languages"
    >
        <template #body>
            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="vertical"
                :items="items"
                class="pb-4"
            />
        </template>
    </UDrawer>
</template>
