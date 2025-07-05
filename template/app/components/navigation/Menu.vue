<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
    collections: NavigationMenuItem[]
}>()

const open = defineModel<boolean>({ default: false })

const { t } = useI18n()

const collections = computed(() => props.collections.map(collection => ({
    ...collection,
    onSelect: () => {
        open.value = false
    },
    class: 'text-muted px-3 hover:text-primary data-active:text-primary',
    icon: 'hugeicons:solid-line-01',
})))
</script>

<template>
    <USlideover
        v-model:open="open"
        :title="t('collections.label')"
        :ui="{
            header: 'min-h-0 h-[49px]',
            close: 'top-2 hover:bg-muted text-muted',
            title: 'font-normal',
        }"
    >
        <template #body>
            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="vertical"
                :items="collections"
                :ui="{
                    linkLabelExternalIcon: 'hidden',
                    linkLeadingIcon: 'size-2.5 mt-0.5 text-muted',
                    linkLabel: 'font-normal',
                }"
                class="pb-4"
            />
        </template>
    </USlideover>
</template>
