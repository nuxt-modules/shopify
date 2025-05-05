<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
    collections: NavigationMenuItem[]
}>()

const open = defineModel<boolean>({ default: false })

const collections = computed(() => props.collections.map(collection => ({
    ...collection,
    onSelect: () => {
        open.value = false
    },
})))
</script>

<template>
    <USlideover
        v-model:open="open"
        title="Collections"
        :ui="{
            header: 'min-h-0 h-[49px]',
            close: 'top-2 hover:bg-muted text-muted',
        }"
    >
        <template #body>
            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="vertical"
                :items="collections"
                class="pb-4"
            />
        </template>
    </USlideover>
</template>
